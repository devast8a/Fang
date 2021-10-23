import { VisitChildren } from '../ast/VisitChildren';
import { createVisitor } from '../ast/visitor';
import { Context, Decl, Node, Tag, RootId } from '../nodes';

export const mangleNames = createVisitor(VisitChildren, (context, decl) => {
    // TODO: Cache results
    if (decl.tag === Tag.DeclFunction && !isBuiltin(decl)) {
        // const path = getPathTo(context, decl);

        // if (path.length === 0) {
        //     return decl;
        // }

        // const prefix = path.reverse().map(elem => elem.name).join('_');

        // return Node.mutate(decl, {
        //     name: `${prefix}_${decl.name}`,
        // });
    }

    return decl;
});

function isBuiltin(decl: Decl) {
    if (decl.name.startsWith("infix") || decl.name.startsWith("prefix") || decl.name.startsWith("postfix")) {
        return true;
    }

    switch (decl.name) {
        case "Ptr":
        case "Size":
        case "bool":
        case "malloc":
        case "printf":
        case "s16":
        case "s32":
        case "s64":
        case "s8":
        case "str":
        case "u16":
        case "u32":
        case "u64":
        case "u8":
            return true;
        
        default:
            return false;
    }
}