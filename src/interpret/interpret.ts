import { Ctx } from '../ast/context';
import { RefLocal, Tag, Function, Ref, Struct, Variable, Trait } from '../ast/nodes';
import { Scope } from "../ast/Scope";
import { unimplemented } from '../utils';
import { VmEnvironment } from './VmEnvironment';
import { VmList } from './VmList';
import { VmString } from './VmString';

export class Interpreter {
    private globals = new Array<any>();

    constructor(
        private ctx: Ctx,
        private root: RefLocal[],
        private scope: Scope,
    ) {
        for (const ref of root) {
            const id = ref.targetId;
            const node = this.ctx.get(ref);

            switch (node.tag) {
                case Tag.Function: this.globals[id] = this.buildFn(node); break;
                case Tag.Struct: this.globals[id] = this.buildStruct(node); break;
                case Tag.Trait: this.globals[id] = this.buildStruct(node); break;
            }
        }

        for (let id = 0; id < ctx.nodes.length; id++) {
            const node = ctx.nodes[id];

            switch (node.tag) {
                case Tag.Function: this.globals[id] = this.buildFn(node); break;
                case Tag.Struct: this.globals[id] = this.buildStruct(node); break;
                case Tag.Trait: this.globals[id] = this.buildStruct(node); break;
            }
        }
    }

    private evaluate(ref: RefLocal | null, env: VmEnvironment): any {
        if (ref === null) {
            return null;
        }

        const node = this.ctx.get(ref);
        switch (node.tag) {
            case Tag.BlockAttribute: {
                return null;
            }
                
            case Tag.Break: {
                return new Control(Type.Break, Value.unwrap(this.evaluate(node.value, env)))
            }

            case Tag.Call: {
                const { target, member } = this.resolve(node.target, env);
                const args = node.args.map(arg => Value.unwrap(this.evaluate(arg, env)))

                if (typeof (target[member]) !== 'function') {
                    throw new Error(`Unknown function ${member}`)
                }

                return target[member](...args);
            }
                
            case Tag.Constant: {
                switch (typeof (node.value)) {
                    case 'string': return new VmString(node.value);
                    default: return node.value;
                }
            }

            case Tag.Construct: {
                const { target, member } = this.resolve(node.target, env);
                const args = node.args.map(arg => Value.unwrap(this.evaluate(arg, env)));

                // TODO: Remove this hack
                if (target === externals && member === 'List') {
                    return new Array(args[0] ?? 0).fill(args[1] ?? 0)
                }

                return new target[member](...args);
            }

            case Tag.Continue: {
                return new Control(Type.Continue, Value.unwrap(this.evaluate(node.value, env)))
            }

            case Tag.ForEach: {
                // eslint-disable-next-line no-constant-condition
                const collection = Value.unwrap(this.evaluate(node.collection, env));

                for (const element of collection) {
                    env.locals[node.element.targetId] = element;
                    const body = this.evaluateBody(node.body, env);

                    if (Value.isExit(body)) {
                        return Value.asExit(body);
                    }
                }
                return null;
            }

            case Tag.Function: {
                return this.buildFn(node, true, env);
            }

            case Tag.Get: {
                const { target, member } = this.resolve(node.source, env);
                return target[member];
            }
                
            case Tag.If: {
                for (const c of node.cases) {
                    if (c.condition === null || Value.asBoolean(this.evaluate(c.condition, env))) {
                        return this.evaluateBody(c.body, env);
                    }
                }
                return null;   
            }
                
            case Tag.Match: {
                const value = Value.unwrap(this.evaluate(node.value, env));

                for (const c of node.cases) {
                    const caseValue = Value.unwrap(this.evaluate(c.value, env));

                    if (compare(value, caseValue)) {
                        return this.evaluateBody(c.body, env);
                    }
                }
                return null;
            }
                
            case Tag.Move: {
                return Value.unwrap(this.evaluate(node.value, env));
            }

            case Tag.Return: {
                return new Control(Type.Return, Value.unwrap(this.evaluate(node.value, env)));
            }
                
            case Tag.Set: {
                const { target, member } = this.resolve(node.target, env);
                return target[member] = Value.unwrap(this.evaluate(node.source, env));
            }

            case Tag.Struct: {
                return this.globals[ref.targetId];
            }
                
            case Tag.Trait: {
                return this.globals[ref.targetId];
            }
                
            case Tag.While: {
                while (Value.asBoolean(this.evaluate(node.condition, env))) {
                    const body = this.evaluateBody(node.body, env);
                
                    if (Value.isExit(body)) {
                        return Value.asExit(body);
                    }
                }
                return null;
            }

            default: {
                throw unimplemented(node as never);
            }
        }
    }

    private evaluateFn(fn: Function, args: any[], env: VmEnvironment) {
        if (args.length > fn.parameters.length) {
            throw new Error(`Called a function with more parameters than exists ${fn.name}`);
        }

        for (let i = 0; i < args.length; i++) {
            env.locals[fn.parameters[i].targetId] = args[i];
        }

        return Value.unwrap(this.evaluateBody(fn.body, env));
    }

    private evaluateBody(body: RefLocal[], env: VmEnvironment) {
        for (const ref of body) {
            const result = this.evaluate(ref, env);

            if (result instanceof Control) {
                return result;
            }
        }
    }

    // Get a value
    get(name: string): any {
        if (name === '$body') {
            return () => Value.unwrap(this.evaluateBody(this.root, VmEnvironment.create()));
        }

        const result = this.scope.lookup(name);

        if (result === null || result.tag !== Tag.RefLocal) {
            return null;
        }

        return this.globals[result.targetId];
    }

    private resolve(ref: Ref, env: VmEnvironment): {target: any, member: any} {
        switch (ref.tag) {
            case Tag.RefGlobal: {
                return { target: this.globals, member: ref.targetId };
            }

            case Tag.RefLocal: {
                if (env.locals[ref.targetId] !== undefined) {
                    return { target: env.locals, member: ref.targetId };
                }

                if (this.globals[ref.targetId] !== undefined) {
                    return { target: this.globals, member: ref.targetId };
                }

                return {target: env.locals, member: ref.targetId}
            }

            // TODO: Replace with lookup in VmEnvironment. Blocked on resolving RefGlobal
            case Tag.RefUp: {
                try {
                    return env.lookup(ref.targetId, ref.distance);
                }
                catch (e) {
                    console.log(this.ctx.nodes[ref.targetId]);
                    throw e;
                }
            }
                
            case Tag.RefName: {
                if (isOperator(ref.target)) {
                    return {
                        member: 'fn',
                        target: { fn: operator(ref.target) },
                    };
                }

                if (externals[ref.target] === undefined) {
                    throw unimplemented(`External identifier: ${ref.target}`);
                }

                return { target: externals, member: ref.target };
            }
                
            case Tag.RefFieldName: {
                const object = this.evaluate(ref.object as RefLocal, env);

                if ((ref.target as any) instanceof RefLocal) {
                    const target = this.evaluate(ref.target as any, env);
                    return { target: object, member: target };
                }

                return { target: object, member: ref.target };
            }
                
            case Tag.RefField: {
                const object = this.evaluate(ref.objectRef as RefLocal, env);
                const target = (this.ctx.get(ref) as any).name;

                return { target: object, member: target };
            }
                
            default: throw unimplemented(ref as never);
        }
    }

    private buildFn(fn: Function, members = true, env: VmEnvironment = VmEnvironment.create()): any {
        // External functions
        if (fn.external) {
            if (fn.name === null) {
                throw new Error('External functions must have a name')
            }

            if (typeof (externals[fn.name]) !== 'function') {
                throw new Error(`External ${fn.name} is not a function`)
            }

            if (isOperator(fn.name)) {
                return operator(fn.name);
            }

            return externals[fn.name];
        }

        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const interpreter = this;

        // Member functions
        if (members && fn.parameters.length > 0 && this.ctx.get(fn.parameters[0]).name === 'self') {
            return function(this: any, ...args: any[]) {
                args.unshift(this);
                return interpreter.evaluateFn(fn, args, env.createChildEnvironment());
            }
        }

        // Regular functions
        return (...args: any[]) => {
            return interpreter.evaluateFn(fn, args, env.createChildEnvironment());
        }
    }

    private buildStruct(struct: Struct | Trait): any {
        const ctx = this.ctx;

        function constructor(this: any, ...args: any[]) {
            for (let i = 0; i < args.length; i++) {
                const member = ctx.get(struct.body[i]) as Variable;
                this[member.name] = args[i];
            }
        }

        const prototype = {} as any;
    
        for (const ref of struct.body) {
            const node = this.ctx.get(ref);

            switch (node.tag) {
                case Tag.Function: {
                    if (node.name === null) {
                        throw new Error('Function in struct must have name');
                    }

                    prototype[node.name] = this.buildFn(node);
                    (constructor as any)[node.name] = this.buildFn(node, false);
                    break;
                }

                case Tag.Set: {
                    const left = this.ctx.get(node.target as RefLocal);
                    const right = this.ctx.get(node.source);

                    if (left.tag === Tag.Variable && right.tag === Tag.Constant) {
                        prototype[left.name] = right.value;
                    } else {
                        throw unimplemented('Only supports assigning constants to members');
                    }
                    break;
                }
            }
        }

        constructor.prototype = prototype;

        return constructor;
    }
}

export enum Type {
    Break,
    Continue,
    Return,
}

export class Control {
    constructor(
        readonly type: Type,
        readonly value: any,
    ) { }
}

function isOperator(name: string) {
    return name.startsWith('infix') || name.startsWith('prefix') || name.startsWith('postfix');
}

function operator(name: string) {
    return (left: any, right: any) => {
        if (typeof left === 'object' && left !== null && typeof left[name] === 'function') {
            return left[name](right);
        }

        return externals[name](left, right);
    }
}

namespace Value {
    export function unwrap(value: any) {
        return value instanceof Control ? value.value : value;
    }

    export function asBoolean(value: any) {
        value = Value.unwrap(value);
        
        if (typeof (value) !== 'boolean') {
            throw new Error('Expecting boolean');
        }

        return value;
    }

    export function isExit(value: any): value is Control {
        return value instanceof Control && value.type !== Type.Continue;
    }

    export function asExit(control: Control) {
        return control.type === Type.Return ? control : control.value;
    }
}

function compare(left: any, right: any) {
    if (left instanceof VmString && right instanceof VmString) {
        return left.value === right.value;
    }
    
    if (left instanceof VmList && right instanceof VmList) {
        if (left.size !== right.size) {
            return false;
        }

        for (let index = 0; index < left.size; index++) {
            if (!compare(left.values[index], right.values[index])) {
                return false;
            }
        }

        return true;
    }

    if (left instanceof Array && right instanceof Array) {
        if (left.length !== right.length) {
            return false;
        }

        for (let index = 0; index < left.length; index++) {
            if (!compare(left[index], right[index])) {
                return false;
            }
        }

        return true;
    }

    return left === right;
}

const externals: any = {
    List: Array,
    Math: Math,
    String: VmString,
    List2: VmList,
    print: (...args: any[]) => console.log(...args),

    'prefix-':  (l: any) => -l,
    'prefix!':  (l: any) => !l,
    'infix+':   (l: any, r: any) => l  + r,
    'infix-':   (l: any, r: any) => l  - r,
    'infix*':   (l: any, r: any) => l  * r,
    'infix/':   (l: any, r: any) => l  / r,
    'infix**':  (l: any, r: any) => l ** r,
    'infix%':   (l: any, r: any) => l  % r,
    'infix<':   (l: any, r: any) => l  < r,
    'infix>':   (l: any, r: any) => l  > r,
    'infix<=':  (l: any, r: any) => l <= r,
    'infix>=':  (l: any, r: any) => l >= r,
    'infix<<':  (l: any, r: any) => l << r,
    'infix>>':  (l: any, r: any) => l >> r,
    'infix|':   (l: any, r: any) => l  | r,
    'infix&':   (l: any, r: any) => l  & r,
    'infixor':  (l: any, r: any) => l || r,
    'infixand': (l: any, r: any) => l && r,
    'infix//':  (l: any, r: any) => Math.floor(l / r),
    'infix!=':  (l: any, r: any) => !compare(l, r),
    'infix==':  compare,

    'infix..': (start: any, end: any) => {
        const result = [];
        for (let i = start; i < end; i++) {
            result.push(i);
        }
        return result;
    },

    true: true,
    false: false,
};
