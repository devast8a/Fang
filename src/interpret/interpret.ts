import { Context } from '../ast/context';
import { Node, Ref, RefId, Tag } from '../ast/nodes';
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

        return () => {
            return this.start(fn.body);
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

    private start(b: RefId[]) {
        this.body = b;

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
                            case 'infix<': return args[0] < args[1];
                            case 'infix>': return args[0] > args[1];
                            case 'infix<=': return args[0] <= args[1];
                            case 'infix>=': return args[0] >= args[1];
                            default: throw unimplemented(ref.target);
                        }
                    }
                    default: throw unimplemented(ref as never);
                }
            }
                
            case Tag.Get: {
                const ref = node.target;
                switch (ref.tag) {
                    case Tag.RefName: return ref.target === 'true';
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