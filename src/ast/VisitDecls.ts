import { Context, Node, NodeId, Tag } from '../nodes';
import { VisitorControl } from './visitor';

export function VisitDecls<State>(context: Context, node: Node, id: NodeId, state: State, control: VisitorControl<State>): Node {
    const { first, next } = control;

    if (node.tag === Tag.Module) {
        const children = node.children;
        const nodes = children.nodes;

        for (const decl of children.decls) {
            const previous = nodes[decl];
            const updated = first(context, previous, decl, state);

            if (previous !== updated) {
                (nodes as any)[decl] = updated;
            }
        }
    }

    return next(context, node, id, state);
}
