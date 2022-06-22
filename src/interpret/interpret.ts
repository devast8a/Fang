import { Context } from '../ast/context';
import { Node, Ref, RefId, Tag } from '../ast/nodes';
import { unimplemented } from '../utils';

export class Interpreter {
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

    private start(body: RefId[]) {
        const stack = [];
        let index = 0;

        // eslint-disable-next-line no-constant-condition
        while (true) {
            // Finished interpretering the block
            if (index >= body.length) {
                const frame = stack.pop();

                if (frame === undefined) {
                    return undefined;
                }

                body = frame.body;
                index = frame.index;
                continue;
            }

            const id = body[index++];
            const node = this.context.nodes[id.target];

            switch (node.tag) {
                // Definitions do nothing
                case Tag.Enum:
                case Tag.Function:
                case Tag.Struct:
                case Tag.Trait:
                case Tag.Variable:
                    break;
                
                case Tag.While: {
                    if (this.execute(node.condition) === true) {
                        stack.push(new StackFrame(index - 1, body));
                        index = 0;
                        body = node.body;
                        break;
                    }
                    break;
                }
                
                case Tag.If: {
                    for (const c of node.cases) {
                        if (c.condition === null || this.execute(c.condition) === true) {
                            stack.push(new StackFrame(index, body));
                            index = 0;
                            body = c.body;
                            break;
                        }
                    }
                    break;
                }

                case Tag.Return: return this.execute(id);
                default: this.execute(id); break;
            }
        }
    }

    private execute(id: RefId): any {
        const node = this.context.nodes[id.target];

        switch (node.tag) {
            case Tag.Call: {
                const args = node.args.map(ref => this.execute(ref as any));
                return args[0] + args[1];
            }
                
            case Tag.Constant: return node.value;
            case Tag.Get:      return false;
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
        public body: RefId[],
    ) { }
}