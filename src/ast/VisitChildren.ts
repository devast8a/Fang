import { Children, Node } from '../nodes';
import { visit, VisitorControl } from './visitor';

export function VisitChildren<State>(state: State, node: Node, parent: number, id: number, control: VisitorControl<State>): Node {
    const { first, next } = control;

    if (Node.hasChildren(node)) {
        const children = node.children;

        const decl = visit.array(state, children.decl, id, first);
        const expr = visit.array(state, children.expr, id, first);

        if (children.decl !== decl || children.expr !== expr) {
            node = Node.mutate(node, {
                children: new Children(decl, expr, children.body, children.names)
            });
        }
    }

    return next(state, node, parent, id);
}
