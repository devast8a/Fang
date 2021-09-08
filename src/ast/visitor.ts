import { Constructor } from '../common/constructor';
import { Node, Tag, Function } from '../nodes';

export class Visitor<State = null> {
    public constructor(
        private visitor: (node: Node, state: State) => Node
    ) {}

    public functionStack = new Array<Function>()

    public node<T extends Node>(node: T, state: State): T {
        const n = node as Node;

        switch (n.tag) {
            case Tag.Class: {
                n.members = this.array(n.members, state);
                return this.visitor(n, state) as T;
            }

            case Tag.Function: {
                this.functionStack.push(n);

                n.parameters = this.array(n.parameters, state);
                n.body       = this.array(n.body, state);
                const result = this.visitor(n, state) as T;

                this.functionStack.pop();
                return result;
            }

            case Tag.Variable: {
                if (n.value) { n.value = this.node(n.value, state); }
                return this.visitor(n, state) as T;
            }

            case Tag.ExprCallStatic: {
                n.args = this.array(n.args, state);
                return this.visitor(n, state) as T;
            }

            case Tag.ExprConstant: {
                return this.visitor(n, state) as T;
            }

            case Tag.ExprConstruct: {
                n.args = this.array(n.args, state);
                return this.visitor(n, state) as T;
            }

            case Tag.ExprGetLocal: {
                return this.visitor(n, state) as T;
            }

            case Tag.ExprMacroCall: {
                // What do we do here?
                return this.visitor(n, state) as T;
            }

            case Tag.ExprSetLocal: {
                n.value = this.node(n.value, state);
                return this.visitor(n, state) as T;
            }

            case Tag.StmtDelete: {
                return this.visitor(n, state) as T;
            }

            case Tag.StmtIf: {
                n.branches   = this.array(n.branches, state);
                n.elseBranch = this.array(n.elseBranch, state);
                return this.visitor(n, state) as T;
            }

            case Tag.StmtIfBranch: {
                n.condition = this.node(n.condition, state);
                n.body      = this.array(n.body, state);
                return this.visitor(n, state) as T;
            }

            case Tag.StmtWhile: {
                n.condition = this.node(n.condition, state);
                n.body      = this.array(n.body, state);
                return this.visitor(n, state) as T;
            }

            case Tag.StmtReturn: {
                if (n.expression) { n.expression = this.node(n.expression, state); }
                return this.visitor(n, state) as T;
            }
        }

        throw new Error(`Visitor.node: No implementation for Node '${Tag[n.tag]}'`);
    }

    public array<T extends Node>(nodes: T[], state: State): T[] {
        return nodes.map((node) => this.node(node, state));
    }
}

export type NodeType = Constructor<Node> & {tag: Tag};

export function convert<T extends NodeType>(node: Node, type: T): InstanceType<T> {
    if (node.tag === type.tag) {
        return node as InstanceType<T>;
    }

    throw new Error(`Expected '${Tag[type.tag]}' but got a '${Tag[node.tag]} instead.`);
}