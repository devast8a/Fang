import { VisitChildren } from '../ast/VisitChildren';
import { createVisitor } from '../ast/visitor';
import { Context, Decl, Node, Tag, RootId } from '../nodes';
import { isBuiltin } from '../targets/targetC';

export const mangleNames = createVisitor(VisitChildren, (context, decl, id) => {
    switch (decl.tag) {
        case Tag.DeclStruct:
        case Tag.DeclFunction:
            if (decl.name === 'main' && decl.children.parent!.id === -1) {
                return decl;
            }

            if (isBuiltin(context, decl)) {
                return decl;
            }

            return Node.mutate(decl, {
                name: decl.name + "_" + id,
            })
    }

    return decl;
});