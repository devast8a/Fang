import { Context } from '../ast/context';
import { Function, Node, Ref, RefId, Tag } from '../ast/nodes';
import { unimplemented, unreachable } from '../utils';

export class Interpreter {
    private stack = new Array<StackFrame>();
    private body = new Array<RefId>();
    private index = 0;
    private locals = new Array<any>();

    constructor(
        public context: Context,
    ) { }

    get(name: string) {
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
            return this.executeFn(fn, args);
        }
    }

    private pop() {
        const frame = this.stack.pop();

        if (frame === undefined) {
            return true;
        }

        this.body = frame.body;
        this.index = frame.index;
        this.locals = frame.locals;
        return false;
    }

    private push(body: RefId[], locals?: any[]) {
        const frame = new StackFrame(this.index, this.locals, this.body);
        this.stack.push(frame);

        this.index = 0;
        this.locals = locals ?? [];
        this.body = body;
    }

    private executeFn(fn: Function, args: any[]) {
        this.body = fn.body;
        
        // Set parameters
        for (let i = 0; i < args.length; i++) {
            this.locals[fn.parameters[i].target] = args[i];
        }

        // eslint-disable-next-line no-constant-condition
        while (true) {
            // Finished interpretering the block
            while (this.index >= this.body.length) {
                if (this.pop()) {
                    return;
                }
            }

            // Decode
            const id = this.body[this.index];
            const node = this.context.nodes[id.target];

            switch (node.tag) {
                // Definitions do nothing
                case Tag.Enum:
                case Tag.Function:
                case Tag.Struct:
                case Tag.Trait:
                case Tag.Variable:
                    this.index++;
                    break;
                
                case Tag.While: {
                    if (this.execute(node.condition) === true) {
                        this.push(node.body, this.locals);
                    } else {
                        this.index++;
                    }
                    break;
                }

                case Tag.ForEach: {
                    const collection = this.execute(node.collection);
                    const variable = node.element.target;
                    break;
                }
                
                case Tag.If: {
                    this.index++;
                    for (const c of node.cases) {
                        if (c.condition === null || this.execute(c.condition) === true) {
                            this.push(c.body, this.locals);
                            break;
                        }
                    }
                    break;
                }

                case Tag.Return: {
                    return this.execute(id);
                }

                default: {
                    this.index++;
                    this.execute(id);
                    break;
                }
            }
        }
    }

    private execute(id: RefId): any {
        const node = this.context.nodes[id.target];

        switch (node.tag) {
            case Tag.Call: {
                const ref = node.target;
                switch (ref.tag) {
                    case Tag.RefName: {
                        const args = node.args.map(ref => this.execute(ref as any));
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
                            case 'infixor': return args[0] || args[1];
                            case 'infixand': return args[0] && args[1];
                            case 'print': console.log(...args); break;
                            case 'wait': for (let i = 0; i < 1000 * 1000 * 100; i++); return;
                            default: throw unimplemented(ref.target);
                        }
                        break;
                    }
                    case Tag.RefId: {
                        // Load the function
                        const fn = this.context.nodes[ref.target] as Function;
                        const args = node.args.map(ref => this.execute(ref as any));
                        const interpreter = new Interpreter(this.context);
                        return interpreter.executeFn(fn, args);
                    }
                    case Tag.RefFieldName: {
                        // Currently there is only one type of structure, the array
                        const object = this.execute(ref.object as RefId);
                        const args = node.args.map(ref => this.execute(ref as any));
                        return object[ref.target](...args);
                    }
                    default: throw unimplemented(ref as never);
                }
                break;
            }
                
            case Tag.Get: {
                const ref = node.target;
                switch (ref.tag) {
                    case Tag.RefName: {
                        switch (ref.target) {
                            case 'true': return true;
                            case 'false': return false;
                            case 'Math': return Math;
                            case 'String': return XString;
                            default: throw unimplemented(ref.target);
                        }
                    }
                    case Tag.RefId: return this.locals[ref.target];
                    case Tag.RefIds: return this.locals[ref.target[0]];
                    default: throw unimplemented(ref as never);
                }
                break;
            }
                
            case Tag.Set: {
                const ref = node.target;
                const value = this.execute(node.value);

                switch (ref.tag) {
                    case Tag.RefName: throw unreachable("Unresolved target of assignment");
                    case Tag.RefId: return this.locals[ref.target] = value;
                    case Tag.RefIds: return this.locals[ref.target[0]] = value;
                    default: throw unimplemented(ref as never);
                }
                break;
            }

            case Tag.Construct: return [];
            case Tag.Constant: return node.value;
            case Tag.Return:   return this.executeNull(node.value);
            default:           throw unimplemented(node as never);
        }
    }

    private executeNull(id: RefId | null) {
        return id === null ? null : this.execute(id);
    }
}

class StackFrame {
    constructor(
        public index: number,
        public locals: any[],
        public body: RefId[],
    ) { }
}

class XString {
    constructor(
        public value: string,
    ) { }

    reverse() {
        return new XString(this.value.split('').reverse().join(''))
    }

    static from(value: any) {
        return new XString(value.toString());
    }
}

function compare(left: any, right: any) {
    if (left instanceof XString && right instanceof XString) {
        return left.value === right.value;
    }

    return left === right;
}