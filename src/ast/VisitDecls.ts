import { Context, Node, Tag } from '../nodes';
import * as Nodes from '../nodes';
import { VisitorControl } from './visitor';

/**
 * Visits all top level Decls in an arbitrary order.
 * 
 * @see createVisitor for an explanation on how to use this function.
 */
export function VisitDecls<State>(node: Node, context: Context, state: State, control: VisitorControl<State>): Node {
    const {first, next} = control;

    if (node.tag === Tag.Module) {
        // TODO: Don't mutate node
        const nodes = node.nodes;
        for (let id = 0; id < nodes.length; id++) {
            nodes[id] = first(nodes[id], context.nextId2(Nodes.RootId, id), state);
        }

        return next(node, context, state);
    }

    return next(node, context, state)
}
