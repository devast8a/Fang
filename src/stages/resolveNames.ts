import { VisitChildren } from '../ast/VisitChildren';
import { createVisitor } from '../ast/visitor';
import { VisitRefDecl } from '../ast/VisitRefDecl';
import { VisitType } from '../ast/VisitType';
import { Module, Node, RefGlobal, RefGlobalMember, RefLocal, RootId, Tag } from '../nodes';

function lookup(module: Module, initialId: number, name: string) {
    // TODO: Support caching
    // TODO: Support names that bind to multiple symbols
    const children = module.children;

    let currentId = initialId;
    while (currentId !== RootId) {
        const container = children.decl[currentId];

        if (!Node.hasChildren(container)) {
            throw new Error(`Unreachable: Found '${Tag[(container as any).tag]}' but expected a Node with a 'children' field.`);
        }

        const names = container.children.names;
        const ids = names.get(name);

        if (ids !== undefined) {
            return currentId === initialId ?
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

export const resolveNames = createVisitor<Module>(VisitChildren, VisitType, VisitRefDecl, (state, node, parent, id) => {
    if (node.tag === Tag.RefName) {
        const ref = lookup(state, parent, node.name);

        if (ref !== undefined) {
            return ref;
        }
    }

    return node;
});