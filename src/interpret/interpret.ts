import { Context } from '../ast/context';
import { Node, Ref, RefId, Tag } from '../ast/nodes';
import { unimplemented } from '../utils';

class StackFrame {

}

export class Interpreter {
    private stack = new Array<StackFrame>();

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
            return this.executeBody(fn.body);
        }
    }

    private executeBody(body: RefId[]) {
        for (const id of body) {
            const node = this.context.nodes[id.target];

            switch (node.tag) {
                case Tag.Enum:
                case Tag.Function:
                case Tag.Struct:
                case Tag.Trait:
                case Tag.Variable:
                    break;
                
                case Tag.Return:
                    return this.execute(id);
                
                default:
                    this.execute(id);
                    break;
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

            case Tag.Constant: {
                return node.value;
            }
            
            case Tag.Return: {
                return node.value === null ? null : this.execute(node.value);
            }

            default:
                throw unimplemented(node as never);
        }
    }
}