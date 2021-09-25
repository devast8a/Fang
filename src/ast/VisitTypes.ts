import { Context, Node, Tag } from '../nodes';
import * as Nodes from '../nodes';
import { VisitorControl } from './visitor';

/**
 * Recurses into fields of a node that are of type Type.
 * 
 * @see VisitChildren often combined with this visitor to traverse the whole AST.
 * @see createVisitor for an explanation on how to use this function.
 */
export function VisitTypes<State>(node: Node, context: Context, state: State, control: VisitorControl<State>): Node {
    const {first, next} = control;

    switch (node.tag) {
        case Tag.DeclFunction: {
            const child = context.nextId(context.currentId);

            const returnType = first(node.returnType, child, state);

            if (returnType !== node.returnType) {
                // TODO: Move DeclFunction.variables into the constructor of DeclFunction
                const old = node;
                node = new Nodes.DeclFunction(node.parent, node.name, node.parameters, returnType, node.body, node.flags);
                node.variables = old.variables;
            }

            return next(node, context, state);
        }

        case Tag.DeclVariable: {
            const type = first(node.type, context, state);

            if (type !== node.type) {
                node = new Nodes.DeclVariable(node.parent, node.name, type, node.value, node.flags);
            }

            return next(node, context, state);
        }

        default: {
            return next(node, context, state);
        }
    }

    throw new Error(`VisitType: No implementation for '${Tag[(node as any).tag]}'`);
}
