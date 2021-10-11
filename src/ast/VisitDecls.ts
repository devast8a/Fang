import { Children, Context, Node, NodeId, Tag } from '../nodes';
import { visit, VisitorControl } from './visitor';

export function VisitDecls<State>(context: Context, node: Node, id: NodeId, state: State, control: VisitorControl<State>): Node {
    const { first, next } = control;

    if (node.tag === Tag.Module) {
        const children = node.children;

        const decls = visit.array(context, children.decls, state, first);

        if (node.children.decls !== decls) {
            node = Node.mutate(node, {
                children: new Children(decls, children.exprs, children.body, children.names)
            });
        }
    }

    return next(context, node, id, state);
}
