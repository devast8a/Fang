import { Children, Context, Node, NodeId } from '../nodes';
import { visit, VisitorControl } from './visitor';

export function VisitChildren<State>(context: Context, node: Node, id: NodeId, state: State, control: VisitorControl<State>): Node {
    const { first, next } = control;

    if (Node.hasChildren(node)) {
        const childContext = context.createChildContext(node.children, id);

        const nodes = node.children.nodes;

        for (let id = 0; id < nodes.length; id++) {
            (nodes as any)[id] = first(childContext, nodes[id], id, state);
        }
    }

    return next(context, node, id, state);
}
