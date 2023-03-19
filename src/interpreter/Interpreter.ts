import { Ctx } from '../ast/context';
import { Tag, Ref, LocalRef, RefById, Struct } from '../ast/nodes';
import { Scope } from '../ast/Scope';
import { assert, unimplemented } from '../common/utils';
import { Control, ControlMode, ControlType } from './Control';
import { Environment } from './Environment';
import { VmFunction } from './vm/VmFunction';
import { VmInstance } from './vm/VmInstance';
import { NativeFunction } from './native/NativeFunction';
import { VmStruct } from './vm/VmStruct';
import { NativeInstance } from './native/NativeInstance';
import { NativeStruct } from './native/NativeStruct';
import { BuiltinList } from './builtins/BuiltinList';
import { BuiltinMath } from './builtins/BuiltinMath';

export function evaluate(env: Environment, ref: Ref | null, mode = ControlMode.Value): any
{
    if (ref === null) {
        return null;
    }

    const node = env.ctx.get(ref);
    switch (node.tag) {
        case Tag.BlockAttribute: {
            // TODO: Implement
            return null;
        }

        case Tag.Break: {
            const value = evaluate(env, node.value);
            return Control.create(mode, ControlType.Break, value);
        }

        case Tag.Call: {
            const object = node.func.object === null ? null : evaluate(env, node.func.object);
            const fn     = env.get(node.func);
            const args = node.args.map(arg => evaluate(env, arg));
            
            assert(fn instanceof VmFunction || fn instanceof NativeFunction);

            return fn.call(object, args);
        }

        case Tag.Constant: {
            return node.value;
        }

        case Tag.Construct: {
            const type = env.get(node.type);
            const args = node.args.map(arg => evaluate(env, arg));

            assert(type instanceof VmStruct || type instanceof NativeStruct,
                'Construct requires that `type` evaluates to a VmStruct.');

            return type.construct(args);
        }

        case Tag.Continue: {
            return Control.create(mode, ControlType.Continue, undefined);
        }

        case Tag.Extend: {
            // TODO: Implement
            return null;
        }

        case Tag.ForEach: {
            const collection = evaluate(env, node.collection);

            for (const element of collection) {
                env.values[node.element.id] = element;
                const control = evaluateBody(env, node.body);

                // TODO: Target continue/break feature
                if (control.type === ControlType.Break)  return control.value;
                if (control.type === ControlType.Return) return Control.pass(mode, control);
            }

            return null;
        }

        case Tag.Function: {
            return env.values[node.id] = new VmFunction(env, node);
        }
            
        case Tag.Get: {
            if (node.source.tag === Tag.RefByExpr) {
                assert(node.source.object !== null);

                // Referring to a field of some object
                const object = evaluate(env, node.source.object);
                const values = node.source.values.map(value => evaluate(env, value));

                assert(object instanceof VmInstance || object instanceof NativeInstance,
                    'target object must be an instance');

                return object.getIndex(values);
            }

            // ================================================================================
            assert(node.source.tag === Tag.RefById,
                'Get requires that the source has been completely resolved');

            if (node.source.object === null) {
                // Referring to an identifier directly
                return env.get(node.source);
            } else {
                // Referring to a field of some object
                const object = evaluate(env, node.source.object);

                assert(object instanceof VmInstance || object instanceof NativeInstance,
                    'target object must be an instance');

                return object.getField(node.source.id);
            }
        }
            
        case Tag.Group: {
            return null;
        }
            
        case Tag.If: {
            for (const c of node.cases) {
                if (c.condition === null || evaluate(env, c.condition)) {
                    const control = evaluateBody(env, c.body);
                    return Control.pass(mode, control);
                }
            }

            return null;
        }
            
        case Tag.Move: {
            return evaluate(env, node.value);
        }
            
        case Tag.Return: {
            const value = evaluate(env, node.value);
            return Control.create(mode, ControlType.Return, value);
        }
            
        case Tag.Set: {
            if (node.target.tag === Tag.RefByExpr) {
                assert(node.target.object !== null);

                // Referring to a field of some object
                const object = evaluate(env, node.target.object);
                const values = node.target.values.map(value => evaluate(env, value));
                const value  = evaluate(env, node.source);

                assert(object instanceof VmInstance || object instanceof NativeInstance,
                    'target object must be an instance');

                object.setIndex(values, value);
                return null;
            }

            // Must be resolved.
            assert(node.target.tag === Tag.RefById);

            if (node.target.object === null) {
                const source = evaluate(env, node.source);
                env.set(node.target, source);
                return null;
            } else {
                // Referring to a field of some object
                const object = evaluate(env, node.target.object);
                const source = evaluate(env, node.source);

                assert(object instanceof VmInstance || object instanceof NativeInstance, 'target object must be an instance');

                object.setField(source.id, source);
                return null;
            }
        }
            
        case Tag.Struct: {
            return null;
        }
            
        case Tag.Trait: {
            return null;
        }
            
        case Tag.Variable: {
            // TODO: This is probably a bad idea.
            return env.values[node.id];
        }
            
        case Tag.While: {
            while (evaluate(env, node.condition)) {
                const control = evaluateBody(env, node.body);

                // TODO: Target continue/break feature
                if (control.type === ControlType.Break)  return control.value;
                if (control.type === ControlType.Return) return Control.pass(mode, control);
            }

            return null;
        }
            
        default: {
            throw unimplemented(node as never);
        }
    }
}

function evaluateBody(env: Environment, body: RefById[]) {
    for (const ref of body) {
        const control = evaluate(env, ref, ControlMode.Control);

        if (control instanceof Control) {
            return control;
        }
    }

    return new Control(ControlType.End, null);
}

export class Interpreter {
    private global: Environment;

    constructor(
        ctx: Ctx,
        private root: LocalRef[],
        private scope: Scope,
    ) {
        const global = this.global = Environment.create(ctx);

        for (const [name, ref] of scope.parent!.symbols) {
            if (ref.ids.length !== 1) {
                continue;
            }

            const node = ctx.nodes[ref.ids[0]];
            if (node.tag === Tag.Constant) {
                global.values[ref.ids[0]] = node.value;
            }
        }

        for (let id = 0; id < ctx.nodes.length; id++) {
            const node = ctx.nodes[id];
            const values = global.values;

            switch (node.tag) {
                case Tag.Function: {
                    if (node.external) {
                        values[id] = new NativeFunction(getExternal(node.name!));
                    } else {
                        values[id] = new VmFunction(global, node);
                    }
                    break;
                }
                    
                case Tag.Struct: {
                    switch (node.name) {
                        case 'List': setup(global, node, BuiltinList); break;
                        default: values[id] = new VmStruct(global, node); break;
                    }
                }
            }
        }
    }

    get(name: string): any {
        if (name === '$body') {
            return () => evaluateBody(this.global, this.root)!.value;
        }

        const result = this.scope.lookup(name);

        if (result === null || result.tag === Tag.RefByIds) {
            return null;
        }

        const fn = this.global.get(result);

        if (fn instanceof VmFunction || fn instanceof NativeFunction) {
            return (...args: any[]) => fn.call(null, args);
        }

        return null;
    }
}

function setup(env: Environment, struct: Struct, builtin: any) {
    const prototype = builtin.prototype as { [field: string]: any };
    const mapping = new Map();

    // Setup all of the Native functions that call the right handler.
    for (const ref of struct.body) {
        const member = env.ctx.get(ref);

        if (member.tag === Tag.Function && member.name !== null) {
            env.values[member.id] = new NativeFunction(prototype[member.name])
        }

        if (member.tag === Tag.Variable) {
            mapping.set(member.id, member.name);
        }
    }

    env.values[struct.id] = new NativeStruct(env, struct, builtin, mapping);
}

function getExternal(name: string) {
    switch (name) {
        // Arithmetic unary operators
        case 'prefix!': return (a: any) => !a;
        case 'prefix-': return (a: any) => -a;

        // Arithmetic binary operators
        case 'infix%': return (a: any, b: any) => a % b;
        case 'infix*': return (a: any, b: any) => a * b;
        case 'infix**': return (a: any, b: any) => a ** b;
        case 'infix+': return (a: any, b: any) => a + b;
        case 'infix-': return (a: any, b: any) => a - b;
        case 'infix/': return (a: any, b: any) => a / b;
        case 'infix//': return (a: any, b: any) => Math.trunc(a / b);

        // Bitwise binary operators
        case 'infix&': return (a: any, b: any) => a & b;
        case 'infix<<': return (a: any, b: any) => a << b;
        case 'infix>>': return (a: any, b: any) => a >> b;
        case 'infix|': return (a: any, b: any) => a | b;

        // Comparison operators
        case 'infix<': return (a: any, b: any) => a < b;
        case 'infix>': return (a: any, b: any) => a > b;
        case 'infix<=': return (a: any, b: any) => a <= b;
        case 'infix>=': return (a: any, b: any) => a >= b;
        case 'infix==': return (a: any, b: any) => a === b;
        case 'infix!=': return (a: any, b: any) => a !== b;

        case 'Math_sqrt': return (a: any) => Math.sqrt(a);

        case 'infix..': return (a: any, b: any) => {
            const values = [];
            for (let i = a; i <= b; i++) {
                values.push(i);
            }
            return values;
        }

        // Logical binary operators
        case 'infixor': return (a: any, b: any) => a || b;
        case 'infixand': return (a: any, b: any) => a && b;

        case 'push': return () => {};
        case 'sqrt': return () => {};

        case 'print': return (...args: any[]) => {
            console.log(...args);
        };
    }

    throw new Error(name);
}