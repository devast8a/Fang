import { VisitChildren } from '../ast/VisitChildren';
import { createVisitor } from '../ast/visitor';
import { VisitRefDecl } from '../ast/VisitRefDecl';
import { VisitType } from '../ast/VisitType';
import { Context, Node, RefGlobal, RefGlobalMember, RefLocal, RootId, Tag } from '../nodes';

function lookup(context: Context, name: string) {
    // TODO: Support caching
    // TODO: Support names that bind to multiple symbols
    const children = context.module.children;

    let currentId = context.parent;
    while (currentId !== RootId) {
        const container = children.decl[currentId];

        if (!Node.hasChildren(container)) {
            throw new Error(`Unreachable: Found '${Tag[(container as any).tag]}' but expected a Node with a 'children' field.`);
        }

        const names = container.children.names;
        const ids = names.get(name);

        if (ids !== undefined) {
            return currentId === context.parent ?
                new RefLocal(ids[0]) :
                new RefGlobalMember(currentId, ids[0]);
        }

        // TODO: Find real parent id
        currentId = RootId;
    }

    // Root context
    const names = children.names;
    const ids = names.get(name);

    if (ids === undefined) {
        return undefined;
    }

    return new RefGlobal(ids[0]);
}

export const resolveNames = createVisitor<null>(VisitChildren, VisitType, VisitRefDecl, (context, node) => {
    if (node.tag === Tag.RefName) {
        const ref = lookup(context, node.name);

        if (ref !== undefined) {
            return ref;
        }
    }

    return node;
});