import { Constructor } from '../common/constructor';
import { Context, Node, Tag } from '../nodes';
import * as Nodes from '../nodes';

export interface VisitorConfig<State> {
    after?:  (node: Node, context: Context, state: State) => Node;
    before?: (node: Node, context: Context, state: State) => {node?: Node, state?: State, continue?: boolean};
    update?: (node: Node, previous: Node, context: Context, state: State) => Node;
}

export class Visitor<State = null> {
    private readonly after?:  (node: Node, context: Context, state: State) => Node;
    private readonly before?: (node: Node, context: Context, state: State) => {node?: Node, state?: State, continue?: boolean};
    private readonly update?: (node: Node, previous: Node, context: Context, state: State) => Node;

    public constructor(config: VisitorConfig<State>) {
        this.after  = config.after;
        this.before = config.before;
        this.update = config.update;
    }

    public node(node: Node, context: Context, state: State): Node {
        let replace: Node | undefined = undefined;

        if (this.before !== undefined) {
            const result = this.before(node, context, state);

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
            // TODO: Revisit Decl visitors
            case Tag.DeclFunction: {
                const ctx     = context.next(node);
                const parameters = this.array(node.parameters, ctx, state);
                const body       = this.array(node.body, ctx, state);
                if (parameters !== node.parameters || body !== node.body) {
                    // HACK: Variables are not passed in as a parameter
                    // TODO: Check parameters are really an array of variables.
                    const variables = node.variables;
                    replace = new Nodes.DeclFunction(node.parent, node.id, node.name, parameters as Nodes.DeclVariable[], node.returnType, body, node.flags);
                    replace.variables = variables;
                }
                break;
            }

            case Tag.DeclModule: {
                break;
            }

            case Tag.DeclStruct: {
                const ctx     = context.next(node);
                const members = this.map(node.members, ctx, state);
                if (members !== node.members) {
                    replace = new Nodes.DeclStruct(node.parent, node.id, node.name, members, new Set(node.superTypes));
                }
                break;
            }

            case Tag.DeclTrait: {
                const ctx     = context.next(node);
                const members = this.array(node.members, ctx, state);
                if (members !== node.members) {
                    replace = new Nodes.DeclTrait(node.parent, node.id, node.name, members, new Set(node.superTypes));
                }
                break;
            }

            case Tag.DeclVariable: {
                if (node.value !== null) {
                    const value = this.node(node.value, context, state);
                    if (value !== node.value) {
                        replace = new Nodes.DeclVariable(node.parent, node.id, node.name, node.type, value, node.flags);
                    }
                }
                break;
            }

            case Tag.ExprCall: {
                const target = this.node(node.target, context, state);
                const args   = this.array(node.args, context, state);
                if (target !== node.target || args !== node.args) {
                    replace = new Nodes.ExprCall(target, args);
                }
                break;
            }

            case Tag.ExprCallStatic: {
                const args = this.array(node.args, context, state);
                if (args !== node.args) {
                    replace = new Nodes.ExprCallStatic(node.target, args);
                }
                break;
            }

            case Tag.ExprCallField: {
                const object = this.node(node.object, context, state);
                const args   = this.array(node.args, context, state);
                if (object !== node.object || args !== node.args) {
                    replace = new Nodes.ExprCallField(node.object, node.field, args);
                }
                break;
            }

            case Tag.ExprConstant: {
                break;
            }

            case Tag.ExprConstruct: {
                const args = this.array(node.args, context, state);
                if (args !== node.args) {
                    replace = new Nodes.ExprConstruct(node.target, args);
                }
                break;
            }

            case Tag.ExprGetField: {
                const object = this.node(node.object, context, state);
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

            case Tag.ExprRefStatic: {
                break;
            }

            case Tag.ExprSetField: {
                const object = this.node(node.object, context, state);
                const value  = this.node(node.value, context, state);
                if (object !== node.object || value !== node.value) {
                    replace = new Nodes.ExprSetField(object, node.field, value);
                }
                break;
            }

            case Tag.ExprSetLocal: {
                const value = this.node(node.value, context, state);
                if (value !== node.value) {
                    replace = new Nodes.ExprSetLocal(node.local, value);
                }
                break;
            }

            case Tag.ExprDestroyLocal: {
                break;
            }

            case Tag.ExprIf: {
                const branches   = this.array(node.branches, context, state);
                const elseBranch = this.array(node.elseBranch, context, state);
                if (branches !== node.branches || elseBranch !== node.elseBranch) {
                    // TODO: Check branches are really an array of StmtIfBranch
                    replace = new Nodes.ExprIf(branches as Nodes.ExprIfBranch[], elseBranch);
                }
                break;
            }

            case Tag.ExprIfBranch: {
                const condition = this.node(node.condition, context, state);
                const body      = this.array(node.body, context, state);
                if (condition !== node.condition || body !== node.body) {
                    replace = new Nodes.ExprIfBranch(condition, body);
                }
                break;
            }

            case Tag.ExprWhile: {
                const condition = this.node(node.condition, context, state);
                const body      = this.array(node.body, context, state);
                if (condition !== node.condition || body !== node.body) {
                    replace = new Nodes.ExprWhile(condition, body);
                }
                break;
            }

            case Tag.ExprReturn: {
                if (node.expression !== null) {
                    const expression = this.node(node.expression, context, state);
                    if (expression !== node.expression) {
                        replace = new Nodes.ExprReturn(expression);
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
                node = this.update(replace, node, context, state);
            } else {
                node = replace;
            }
        }

        if (this.after !== undefined) {
            node = this.after(node, context, state);
        }

        return node;
    }

    public array(nodes: Node[], context: Context, state: State): Node[] {
        const length = nodes.length;
        for (let index = 0; index < length; index++) {
            const input  = nodes[index];
            const output = this.node(input, context, state);

            // Handle the case where one of the functions returned a new object.
            if (input !== output) {
                const copy = nodes.slice();

                copy[index] = output;
                index++;

                while (index < length) {
                    copy[index] = this.node(nodes[index], context, state);
                    index++;
                }

                return copy;
            }
        }
        return nodes;
    }

    // TODO: This can probably be removed
    public map(nodes: Map<string, Node>, context: Context, state: State): Map<string, Node> {
        const entries = Array.from(nodes.entries());

        const input   = entries.map(x => x[1]);
        const output  = this.array(input, context, state);

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