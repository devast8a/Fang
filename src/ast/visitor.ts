import { Constructor } from '../common/constructor';
import { Node, Tag } from '../nodes';
import * as Nodes from '../nodes';

type Container = Node;

export class Visitor<State = null> {
    public constructor(
        private visitor: (node: Node, container: Container, state: State) => Node
    ) {}

    public node<T extends Node>(node: T, container: Container, state: State): T {
        let n = node as Node;

        switch (n.tag) {
            case Tag.Class: {
                const members = this.array(n.members, n, state);
                if (members !== n.members) {
                    n = new Nodes.Class(n.name, members, new Set(n.superTypes));
                }
                break;
            }

            case Tag.Function: {
                const parameters = this.array(n.parameters, n, state);
                const body       = this.array(n.body, n, state);
                if (parameters !== n.parameters || body !== n.body) {
                    n = new Nodes.Function(n.name, parameters, n.returnType, body, n.flags);
                }
                break;
            }

            case Tag.Trait: {
                const members = this.array(n.members, n, state);
                if (members !== n.members) {
                    n = new Nodes.Trait(n.name, members, new Set(n.superTypes));
                }
                break;
            }

            case Tag.Variable: {
                if (n.value !== null) {
                    const value = this.node(n.value, container, state);
                    if (value !== n.value) {
                        n = new Nodes.Variable(n.name, n.type, value, n.flags, n.id);
                    }
                }
                break;
            }

            case Tag.ExprCallStatic: {
                const args = this.array(n.args, container, state);
                if (args !== n.args) {
                    n = new Nodes.ExprCallStatic(n.target, args);
                }
                break;
            }

            case Tag.ExprConstant: {
                break;
            }

            case Tag.ExprConstruct: {
                const args = this.array(n.args, container, state);
                if (args !== n.args) {
                    n = new Nodes.ExprConstruct(n.target, args);
                }
                break;
            }

            case Tag.ExprGetLocal: {
                break;
            }

            case Tag.ExprMacroCall: {
                // TODO: Implement ExprMacroCall correctly
                break;
            }

            case Tag.ExprSetField: {
                const object = this.node(n.object, container, state);
                const value  = this.node(n.value, container, state);
                if (object !== n.object || value !== n.value) {
                    n = new Nodes.ExprSetField(object, n.field, value);
                }
                break;
            }

            case Tag.ExprSetLocal: {
                const value = this.node(n.value, container, state);
                if (value !== n.value) {
                    n = new Nodes.ExprSetLocal(n.local, value);
                }
                break;
            }

            case Tag.StmtDelete: {
                break;
            }

            case Tag.StmtIf: {
                const branches   = this.array(n.branches, container, state);
                const elseBranch = this.array(n.elseBranch, container, state);
                if (branches !== n.branches || elseBranch !== n.elseBranch) {
                    n = new Nodes.StmtIf(branches, elseBranch);
                }
                break;
            }

            case Tag.StmtIfBranch: {
                const condition = this.node(n.condition, container, state);
                const body      = this.array(n.body, container, state);
                if (condition !== n.condition || body !== n.body) {
                    n = new Nodes.StmtIfBranch(condition, body);
                }
                break;
            }

            case Tag.StmtWhile: {
                const condition = this.node(n.condition, container, state);
                const body      = this.array(n.body, container, state);
                if (condition !== n.condition || body !== n.body) {
                    n = new Nodes.StmtWhile(condition, body);
                }
                break;
            }

            case Tag.StmtReturn: {
                if (n.expression !== null) {
                    const expression = this.node(n.expression, container, state);
                    if (expression !== n.expression) {
                        n = new Nodes.StmtReturn(expression);
                    }
                }
                break;
            }

            default: {
                throw new Error(`Visitor.node: No implementation for Node '${Tag[n.tag]}'`);
            }
        }

        return this.visitor(n, container, state) as T;
    }

    public array<T extends Node>(nodes: T[], container: Container, state: State): T[] {
        const length = nodes.length;
        for (let index = 0; index < length; index++) {
            const input  = nodes[index];
            const output = this.node(input, container, state);

            // Handle the case where one of the functions returned a new object.
            if (input !== output) {
                const copy = nodes.slice();

                copy[index] = output;
                index++;

                while (index < length) {
                    copy[index] = this.node(nodes[index], container, state);
                    index++;
                }

                return copy;
            }
        }
        return nodes;
    }
}

export type NodeType = Constructor<Node> & {tag: Tag};

export function convert<T extends NodeType>(node: Node, type: T): InstanceType<T> {
    if (node.tag === type.tag) {
        return node as InstanceType<T>;
    }

    throw new Error(`Expected '${Tag[type.tag]}' but got a '${Tag[node.tag]} instead.`);
}