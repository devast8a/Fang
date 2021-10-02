import { Context, DeclFunction, Node, Tag } from '../nodes';
import * as Nodes from '../nodes';
import { VisitorControl, visit } from './visitor';

/**
 * Recurses into fields of a node that are of type Decl or Expr. Only recurses into children that are owned by the
 *  node and will not recurse into referenced nodes.
 * 
 * @see createVisitor for an explanation on how to use this function.
 */
export function VisitChildren<State>(node: Node, context: Context, state: State, control: VisitorControl<State>): Node {
    const {first, next} = control;

    switch (node.tag) {
        case Tag.Module: {
            // TODO: Don't mutate node
            const nodes = node.nodes;
            const length = nodes.length;
            for (let id = 0; id < length; id++) {
                nodes[id] = first(nodes[id], context.nextId2(Nodes.RootId, id), state);
            }

            return next(node, context, state);
        }

        case Tag.DeclFunction: {
            const child = context.nextId(context.currentId);

            const parameters = visit.array(node.parameters, child, state, first);
            const body = visit.array(node.body, child, state, first);

            if (parameters !== node.parameters || body !== node.body) {
                // TODO: Move DeclFunction.variables into the constructor of DeclFunction
                const old = node;
                node = new Nodes.DeclFunction(node.parent, node.name, parameters as Nodes.DeclVariable[], node.returnType, body, node.flags);
                node.variables = old.variables;
            }

            return next(node, context, state);
        }

        case Tag.DeclImport: {
            return next(node, context, state);
        }

        case Tag.DeclStruct: {
            const nodes = node.children.nodes;

            for (let id = 0; id < nodes.length; id++) {
                // Assume that the name doesn't change
                nodes[id] = first(nodes[id], context.nextId2(Nodes.RootId, id), state);
            }

            return next(node, context, state);
        }

        case Tag.DeclTrait: {
            // TODO: Support members

            return next(node, context, state);
        }

        case Tag.DeclVariable: {
            if (node.value !== null) {
                const value = first(node.value, context, state);

                if (value !== node.value) {
                    node = new Nodes.DeclVariable(node.parent, node.name, node.type, value, node.flags);
                }
            }

            return next(node, context, state);
        }

        case Tag.ExprArgument: {
            const value = first(node.value, context, state);

            if (value !== node.value) {
                node = new Nodes.ExprArgument(node.name, value);
            }

            return next(node, context, state);
        }

        case Tag.ExprCall: {
            const target = first(node.target, context, state);
            const args = visit.array(node.args, context, state, first);

            if (target !== node.target || args !== node.args) {
                node = new Nodes.ExprCall(target, args);
            }

            return next(node, context, state);
        }

        case Tag.ExprCallStatic: {
            const args = visit.array(node.args, context, state, first);

            if (args !== node.args) {
                node = new Nodes.ExprCallStatic(node.target, args);
            }

            return next(node, context, state);
        }

        case Tag.ExprCallField: {
            const object = first(node.object, context, state);
            const args = visit.array(node.args, context, state, first);

            if (object !== node.object || args !== node.args) {
                node = new Nodes.ExprCallField(node.object, node.field, args);
            }

            return next(node, context, state);
        }

        case Tag.ExprConstant: {
            return next(node, context, state);
        }

        case Tag.ExprConstruct: {
            const args = visit.array(node.args, context, state, first);

            if (args !== node.args) {
                node = new Nodes.ExprConstruct(node.target, args);
            }

            return next(node, context, state);
        }

        case Tag.ExprDeclaration: {
            const decl = context.resolve(node);

            if (decl.tag === Tag.DeclVariable) {
                const result = first(decl, context, state);

                if (result !== decl) {
                    Node.as(context.parent, DeclFunction).variables[node.member] = result;
                }
            }

            return next(node, context, state);
        }

        case Tag.ExprGetField: {
            const object = first(node.object, context, state);

            if (object !== node.object) {
                node = new Nodes.ExprGetField(object, node.field);
            }

            return next(node, context, state);
        }

        case Tag.ExprGetLocal: {
            return next(node, context, state);
        }

        case Tag.ExprRefName: {
            return next(node, context, state);
        }

        case Tag.ExprRefStatic: {
            return next(node, context, state);
        }

        case Tag.ExprSetField: {
            const object = first(node.object, context, state);
            const value = first(node.value, context, state);

            if (object !== node.object || value !== node.value) {
                node = new Nodes.ExprSetField(object, node.field, value);
            }

            return next(node, context, state);
        }

        case Tag.ExprSetLocal: {
            const value = first(node.value, context, state);

            if (value !== node.value) {
                node = new Nodes.ExprSetLocal(node.local, value);
            }

            return next(node, context, state);
        }

        case Tag.ExprIf: {
            const branches = visit.array(node.branches, context, state, first);
            const elseBranch = visit.array(node.elseBranch, context, state, first);

            if (branches !== node.branches || elseBranch !== node.elseBranch) {
                node = new Nodes.ExprIf(branches as Nodes.ExprIfBranch[], elseBranch);
            }

            return next(node, context, state);
        }

        case Tag.ExprIfBranch: {
            const condition = first(node.condition, context, state);
            const body = visit.array(node.body, context, state, first);

            if (condition !== node.condition || body !== node.body) {
                node = new Nodes.ExprIfBranch(condition, body);
            }

            return next(node, context, state);
        }

        case Tag.ExprWhile: {
            const condition = first(node.condition, context, state);
            const body = visit.array(node.body, context, state, first);

            if (condition !== node.condition || body !== node.body) {
                node = new Nodes.ExprWhile(condition, body);
            }

            return next(node, context, state);
        }

        case Tag.ExprReturn: {
            if (node.expression !== null) {
                const expression = first(node.expression, context, state);

                if (expression !== node.expression) {
                    node = new Nodes.ExprReturn(expression);
                }
            }

            return next(node, context, state);
        }

        case Tag.TypeInfer: return next(node, context, state);
        case Tag.TypeRefName: return next(node, context, state);
        case Tag.TypeRefStatic: return next(node, context, state);
    }

    throw new Error(`VisitChildren: No implementation for '${Tag[(node as any).tag]}'`);
}