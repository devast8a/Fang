import { Constructor } from '../common/constructor';
import { Context, Expr, Node, Tag } from '../nodes';
import * as Nodes from '../nodes';

export interface VisitorConfig<State> {
    after?:  (node: Expr, context: Context, state: State) => Expr;
    before?: (node: Expr, context: Context, state: State) => {node?: Expr, state?: State, continue?: boolean};
    update?: (node: Expr, previous: Expr, context: Context, state: State) => Expr;
}

export class Visitor<State = null> {
    private readonly after?:  (node: Expr, context: Context, state: State) => Expr;
    private readonly before?: (node: Expr, context: Context, state: State) => {node?: Expr, state?: State, continue?: boolean};
    private readonly update?: (node: Expr, previous: Expr, context: Context, state: State) => Expr;

    public constructor(config: VisitorConfig<State>) {
        this.after  = config.after;
        this.before = config.before;
        this.update = config.update;
    }

    public node(node: Expr, context: Context, state: State): Expr {
        let replace: Expr | undefined = undefined;

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

            case Tag.ExprDeclaration: {
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

    public array(nodes: Expr[], context: Context, state: State): Expr[] {
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
}

export type NodeType = Constructor<Node> & {tag: Tag};

export function convert<T extends NodeType>(node: Node, type: T): InstanceType<T> {
    if (node.tag === type.tag) {
        return node as InstanceType<T>;
    }

    throw new Error(`Expected '${Tag[type.tag]}' but got a '${Tag[node.tag]} instead.`);
}