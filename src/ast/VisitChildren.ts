import { Children, Context, Node, NodeId } from '../nodes';
import { visit, VisitorControl } from './visitor';

export function VisitChildren<State>(context: Context, node: Node, id: NodeId, state: State, control: VisitorControl<State>): Node {
    const { first, next } = control;

    if (Node.hasChildren(node)) {
        const children = node.children;

        const childContext = context.createChildContext(children, id);

        const decls = visit.array(childContext, children.decls, state, first);
        const exprs = visit.array(childContext, children.exprs, state, first);

        if (children.decls !== decls || children.exprs !== exprs) {
            node = Node.mutate(node, {
                children: new Children(decls, exprs, children.body, children.names)
            });
        }
    }

    return next(context, node, id, state);
}
