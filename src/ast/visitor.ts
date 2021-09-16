import { Constructor } from '../common/constructor';
import { Node, Tag } from '../nodes';
import * as Nodes from '../nodes';

type Container = Node;

export interface VisitorConfig<State> {
    after?:  (node: Node, container: Container, state: State) => Node;
    before?: (node: Node, container: Container, state: State) => {node?: Node, state?: State, continue?: boolean};
    update?: (node: Node, previous: Node, container: Container, state: State) => Node;
}

export class Visitor<State = null> {
    private readonly after?:  (node: Node, container: Container, state: State) => Node;
    private readonly before?: (node: Node, container: Container, state: State) => {node?: Node, state?: State, continue?: boolean};
    private readonly update?: (node: Node, previous: Node, container: Container, state: State) => Node;

    public constructor(config: VisitorConfig<State>) {
        this.after  = config.after;
        this.before = config.before;
        this.update = config.update;
    }

    public node(node: Node, container: Container, state: State): Node {
        let replace: Node | undefined = undefined;

        if (this.before !== undefined) {
            const result = this.before(node, container, state);

            if (result.node !== undefined) {
                node = result.node;
            }

            if (result.state !== undefined) {
                state = result.state;
            }
            
            if (result.continue === false) {
                return node;
            }
        }

        switch (node.tag) {
            case Tag.Class: {
                const members = this.map(node.members, node, state);
                if (members !== node.members) {
                    replace = new Nodes.Class(node.name, members, new Set(node.superTypes));
                }
                break;
            }

            case Tag.Function: {
                const parameters = this.array(node.parameters, node, state);
                const body       = this.array(node.body, node, state);
                if (parameters !== node.parameters || body !== node.body) {
                    // HACK: Variables are not passed in as a parameter
                    // TODO: Check parameters are really an array of variables.
                    const variables = node.variables;
                    replace = new Nodes.Function(node.name, parameters as Nodes.Variable[], node.returnType, body, node.flags);
                    replace.variables = variables;
                }
                break;
            }

            case Tag.Trait: {
                const members = this.array(node.members, node, state);
                if (members !== node.members) {
                    replace = new Nodes.Trait(node.name, members, new Set(node.superTypes));
                }
                break;
            }

            case Tag.Variable: {
                if (node.value !== null) {
                    const value = this.node(node.value, container, state);
                    if (value !== node.value) {
                        replace = new Nodes.Variable(node.name, node.type, value, node.flags, node.id);
                    }
                }
                break;
            }

            case Tag.ExprCall: {
                const target = this.node(node.target, container, state);
                const args   = this.array(node.args, container, state);
                if (target !== node.target || args !== node.args) {
                    replace = new Nodes.ExprCall(target, args);
                }
                break;
            }

            case Tag.ExprCallStatic: {
                const args = this.array(node.args, container, state);
                if (args !== node.args) {
                    replace = new Nodes.ExprCallStatic(node.target, args);
                }
                break;
            }

            case Tag.ExprCallField: {
                const object = this.node(node.object, container, state);
                const args   = this.array(node.args, container, state);
                if (object !== node.object || args !== node.args) {
                    replace = new Nodes.ExprCallField(node.object, node.field, args);
                }
                break;
            }

            case Tag.ExprConstant: {
                break;
            }

            case Tag.ExprConstruct: {
                const args = this.array(node.args, container, state);
                if (args !== node.args) {
                    replace = new Nodes.ExprConstruct(node.target, args);
                }
                break;
            }

            case Tag.ExprGetField: {
                const object = this.node(node.object, container, state);
                if (object !== node.object) {
                    replace = new Nodes.ExprGetField(object, node.field);
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

            case Tag.ExprRefName: {
                break;
            }

            case Tag.ExprRefNode: {
                break;
            }

            case Tag.ExprSetField: {
                const object = this.node(node.object, container, state);
                const value  = this.node(node.value, container, state);
                if (object !== node.object || value !== node.value) {
                    replace = new Nodes.ExprSetField(object, node.field, value);
                }
                break;
            }

            case Tag.ExprSetLocal: {
                const value = this.node(node.value, container, state);
                if (value !== node.value) {
                    replace = new Nodes.ExprSetLocal(node.local, value);
                }
                break;
            }

            case Tag.StmtDelete: {
                break;
            }

            case Tag.StmtIf: {
                const branches   = this.array(node.branches, container, state);
                const elseBranch = this.array(node.elseBranch, container, state);
                if (branches !== node.branches || elseBranch !== node.elseBranch) {
                    // TODO: Check branches are really an array of StmtIfBranch
                    replace = new Nodes.StmtIf(branches as Nodes.StmtIfBranch[], elseBranch);
                }
                break;
            }

            case Tag.StmtIfBranch: {
                const condition = this.node(node.condition, container, state);
                const body      = this.array(node.body, container, state);
                if (condition !== node.condition || body !== node.body) {
                    replace = new Nodes.StmtIfBranch(condition, body);
                }
                break;
            }

            case Tag.StmtWhile: {
                const condition = this.node(node.condition, container, state);
                const body      = this.array(node.body, container, state);
                if (condition !== node.condition || body !== node.body) {
                    replace = new Nodes.StmtWhile(condition, body);
                }
                break;
            }

            case Tag.StmtReturn: {
                if (node.expression !== null) {
                    const expression = this.node(node.expression, container, state);
                    if (expression !== node.expression) {
                        replace = new Nodes.StmtReturn(expression);
                    }
                }
                break;
            }

            default: {
                throw new Error(`Visitor.node: No implementation for Node '${Tag[node.tag]}'`);
            }
        }

        if (replace !== undefined) {
            if (this.update !== undefined) {
                node = this.update(replace, node, container, state);
            } else {
                node = replace;
            }
        }

        if (this.after !== undefined) {
            node = this.after(node, container, state);
        }

        return node;
    }

    public array(nodes: Node[], container: Container, state: State): Node[] {
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

    public map(nodes: Map<string, Node>, container: Container, state: State): Map<string, Node> {
        const entries = Array.from(nodes.entries());

        const input   = entries.map(x => x[1]);
        const output  = this.array(input, container, state);

        if (input === output) {
            return nodes;
        } else {
            for (let i = 0; i < entries.length; i++) {
                entries[i][1] = output[i];
            }
            return new Map(entries);
        }
    }
}

export type NodeType = Constructor<Node> & {tag: Tag};

export function convert<T extends NodeType>(node: Node, type: T): InstanceType<T> {
    if (node.tag === type.tag) {
        return node as InstanceType<T>;
    }

    throw new Error(`Expected '${Tag[type.tag]}' but got a '${Tag[node.tag]} instead.`);
}