import { inspect } from 'util';
import { Context } from '../ast/context';
import { Function, Node, Ref, RefId, Struct, Tag, Variable } from '../ast/nodes';
import { unimplemented, unreachable } from '../utils';

export class Interpreter {
    constructor(
        private context: Context,
        private root: RefId[],
    ) { }

    get(name: '$body'): (...args: any[]) => any;
    get(name: string): ((...args: any[]) => any) | null;
    get(name: string) {
        if (name === '$body') {
            return () => {
                const result = this.executeBody(this.root, []);
                return result instanceof ControlFlow ? result.value : result;
            };
        }

        const ids = this.context.scope.symbols.get(name);

        // Could not find the symbol
        if (ids === undefined) {
            return null;
        }

        // TODO: Support overload resolution
        const id = ids[0];
        const fn = this.context.nodes[id];

        if (fn.tag !== Tag.Function) {
            return null;
        }

        return (...args: any[]) => {
            return this.executeFunction(fn, args);
        }
    }

    private execute(id: RefId, locals: Value[]): (Value | ControlFlow) {
        const node = this.context.nodes[id.target];

        switch (node.tag) {
            // Declerations
            case Tag.Enum:
            case Tag.Function:
            case Tag.Struct:
            case Tag.Trait:
            case Tag.Variable:
                return null;
                
            // Expressions
            case Tag.Break: {
                return new ControlFlow(
                    ControlFlowType.Break,
                    null,
                );
            }

            case Tag.Call: {
                const ref = node.target;
                switch (ref.tag) {
                    case Tag.RefName: {
                        const args = node.args.map(ref =>
                            ToValue(this.execute(ref, locals)) as any
                        );

                        switch (ref.target) {
                            case 'infix+': return args[0] + args[1];
                            case 'infix-': return args[0] - args[1];
                            case 'infix*': return args[0] * args[1];
                            case 'infix/': return args[0] / args[1];
                            case 'infix**': return args[0] ** args[1];
                            case 'infix//': return Math.trunc(args[0] / args[1]);
                            case 'infix%': return args[0] % args[1];
                            case 'infix<': return args[0] < args[1];
                            case 'infix>': return args[0] > args[1];
                            case 'infix==': return compare(args[0], args[1]);
                            case 'infix!=': return !compare(args[0], args[1]);
                            case 'infix<=': return args[0] <= args[1];
                            case 'infix>=': return args[0] >= args[1];
                            case 'infix||': return args[0] || args[1];
                            case 'infix&&': return args[0] && args[1];
                            case 'infix..': {
                                const result = [];
                                for (let i = args[0]; i < args[1]; i++) {
                                    result.push(i);
                                }
                                return result;
                            }
                            case 'infixor': return args[0] || args[1];
                            case 'infixand': return args[0] && args[1];
                            case 'print': console.log(...args); break;
                            default: throw unimplemented(ref.target);
                        }
                        break;
                    }
                    case Tag.RefId: {
                        // Load the function
                        const fn = this.context.nodes[ref.target] as Function;
                        const args = node.args.map(ref => ToValue(this.execute(ref, locals)));
                        return this.executeFunction(fn, args);
                    }
                    case Tag.RefFieldName: {
                        const object = this.execute(ref.object as RefId, locals) as any;
                        const args = node.args.map(ref => ToValue(this.execute(ref, locals)));
                        return object[ref.target](...args);
                    }
                    default: throw unimplemented(ref as never);
                }
                return null;
            }
                
            case Tag.Constant: {
                return typeof(node.value) === 'string' ? new FString(node.value) : node.value;
            }
                
            case Tag.Construct: {
                const ref = node.target;
                
                const args = node.args.map(arg => this.execute(arg, locals));
                switch (ref.tag) {
                    case Tag.RefId: {
                        const target = this.context.nodes[ref.target] as Struct;

                        const object = {} as any;

                        for (let i = 0; i < target.body.length; i++) {
                            object[(this.context.nodes[target.body[i].target] as Variable).name] = args[i];
                        }

                        return object;
                    }
                        
                    case Tag.RefName: {
                        switch (ref.target) {
                            case 'List': return new Array(args?.[0] ?? 0).fill(args?.[1] ?? 0);
                            case 'Set': return new Set();
                        }
                        throw unimplemented(ref.target);
                    }
                }
                throw unimplemented(ref as never);
            }
                
            case Tag.ForEach: {
                // eslint-disable-next-line no-constant-condition
                const collection = ToValue(this.execute(node.collection, locals)) as any;

                for (const element of collection) {
                    locals[node.element.target] = element;
                    const body = this.executeBody(node.body, locals);

                    if (IsExit(body)) return ToExit(body);
                }
                return null;
            }

            case Tag.Get: {
                const ref = node.target;
                switch (ref.tag) {
                    case Tag.RefName: {
                        switch (ref.target) {
                            case 'true': return true;
                            case 'false': return false;
                            case 'Math': return Math;
                            case 'String': return FString;
                            default: throw unimplemented(ref.target);
                        }
                    }
                    case Tag.RefId: return locals[ref.target];
                    case Tag.RefIds: return locals[ref.target[0]];
                    case Tag.RefFieldName: {
                        const object = ToValue(this.execute(ref.object as RefId, locals));

                        if (typeof (ref.target) === 'string') {
                            return (object as any)[ref.target];
                        } else {
                            const index = ToNumber(this.execute(ref.target, locals));
                            return (object as any)[index];
                        }
                    }
                    default: throw unimplemented(ref as never);
                }
                break;
            }
                
            case Tag.If: {
                for (const c of node.cases) {
                    if (c.condition === null || ToBoolean(this.execute(c.condition, locals))) {
                        return this.executeBody(c.body, locals);
                    }
                }
                return null;
            }
                
            case Tag.Return: {
                return new ControlFlow(
                    ControlFlowType.Return,
                    ToValue(node.value === null ? null : this.execute(node.value, locals)),
                );
            }

            case Tag.Set: {
                const ref = node.target;
                const value = ToValue(this.execute(node.value, locals));

                switch (ref.tag) {
                    case Tag.RefName: throw unreachable("Unresolved target of assignment");
                    case Tag.RefId: return (locals[ref.target] = value);
                    case Tag.RefIds: return (locals[ref.target[0]] = value);
                    case Tag.RefFieldName: {
                        const object = ToValue(this.execute(ref.object as RefId, locals));

                        if (typeof (ref.target) === 'string') {
                            return (object as any)[ref.target] = value;
                        } else {
                            const index = ToNumber(this.execute(ref.target, locals));
                            return (object as any)[index] = value;
                        }
                    }
                    default: throw unimplemented(ref as never);
                }
                break;
            }

            case Tag.While: {
                // eslint-disable-next-line no-constant-condition
                while (ToBoolean(this.execute(node.condition, locals))) {
                    const body = this.executeBody(node.body, locals);

                    if (IsExit(body)) return ToExit(body);
                }
                return null;
            }
        }

        throw unimplemented(node as never);
    }

    private executeBody(ids: RefId[], locals: Value[]): (Value | ControlFlow) {
        for (const id of ids) {
            const result = this.execute(id, locals);

            if (result instanceof ControlFlow) {
                return result;
            }
        }

        return null;
    }

    private executeFunction(fn: Function, args: any[]) {
        // Set parameter values
        const locals = [];
        for (let i = 0; i < args.length; i++) {
            locals[fn.parameters[i].target] = args[i];
        }

        const result = this.executeBody(fn.body, locals);
        return result instanceof ControlFlow ? result.value : result;
    }
}

type Value =
    | boolean
    | number
    | string
    | null
    | object
    ;

enum ControlFlowType {
    Break,
    Continue,
    Return,
}

class ControlFlow {
    constructor(
        readonly control: ControlFlowType,
        readonly value: Value,
    ) { }
}

// Check that `value` is of type `Value` and not `ControlFlow`
function ToValue(value: Value | ControlFlow): Value {
    if (value instanceof ControlFlow) {
        throw new Error('Type Error: expected value')
    }

    return value;
}

function ToBoolean(value: Value | ControlFlow): boolean {
    if (typeof (value) !== 'boolean') {
        throw new Error('Type Error: expected boolean')
    }

    return value;
}

function ToNumber(value: Value | ControlFlow): number {
    if (typeof (value) !== 'number') {
        throw new Error('Type Error: expected number')
    }

    return value;
}

function IsExit(value: Value | ControlFlow): value is ControlFlow {
    if (!(value instanceof ControlFlow)) {
        return false;
    }

    return value.control !== ControlFlowType.Continue;
}

function ToExit(value: ControlFlow) {
    return value.control === ControlFlowType.Return ? value : value.value;
}

function compare(left: Value, right: Value) {
    if (left instanceof FString && right instanceof FString) {
        return left.value === right.value;
    }

    return left === right;
}

class FString {
    constructor(
        readonly value: string
    ) { }

    static from(value: Value) {
        return new FString(value?.toString() ?? "");
    }

    reverse() {
        return new FString(this.value.split('').reverse().join(''));
    }

    strip() {
        return new FString(this.value.trim());
    }

    replace(value: string, replace: string) {
        return new FString(this.value.replace(new RegExp(value, 'g'), replace));
    }

    toString() {
        return this.value;
    }

    [inspect.custom]() {
        return this.value;
    }
}