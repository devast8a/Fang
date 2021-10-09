import { Children, Context, Node, NodeId } from '../nodes';
import { visit, VisitorControl } from './visitor';

export function VisitChildren<State>(context: Context, node: Node, id: NodeId, state: State, control: VisitorControl<State>): Node {
    const { first, next } = control;

    if (Node.hasChildren(node)) {
        const children = node.children;

        const childContext = new Context(
            context.module,
            children,
            id
        );

        const decl = visit.array(childContext, children.decls, state, first);
        const expr = visit.array(childContext, children.exprs, state, first);

        if (children.decls !== decl || children.exprs !== expr) {
            node = Node.mutate(node, {
                children: new Children(decl, expr, children.body, children.names)
            });
        }
    }

    return next(context, node, id, state);
}
