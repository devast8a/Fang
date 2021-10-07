import { VisitChildren } from '../ast/VisitChildren';
import { createVisitor } from '../ast/visitor';
import { VisitRefDecl } from '../ast/VisitRefDecl';
import { VisitType } from '../ast/VisitType';
import { Module, RefGlobal, RefGlobalMember, RefLocal, RootId, Tag } from '../nodes';

function lookup(module: Module, initialId: number, name: string) {
    // TODO: Support caching
    // TODO: Support names that bind to multiple symbols
    const children = module.children;

    let currentId = initialId;
    while (currentId !== RootId) {
        const container = children.decl[currentId];

        // Check that container actually has 'children' field
        switch (container.tag) {
            case Tag.DeclFunction:
            case Tag.DeclStruct:
            case Tag.DeclTrait:
                break;
            
            default:
                throw new Error(`Unreachable: Unhandled case: ${Tag[(container as any).tag]}`);
        }

        const names = container.children.names;
        const ids = names.get(name);

        if (ids !== undefined) {
            if (currentId === initialId) {
                return new RefLocal(ids[0]);
            } else {
                return new RefGlobalMember(currentId, ids[0]);
            }
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