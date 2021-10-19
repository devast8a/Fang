import { VisitDecls } from '../ast/VisitDecls';
import { createVisitor } from '../ast/visitor';
import { Decl, Node, Tag } from '../nodes';

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

export const mangleNames = createVisitor(VisitDecls, (context, decl) => {
    if (decl.tag === Tag.DeclFunction && !isBuiltin(decl)) {
        return Node.mutate(decl, {
            name: decl.name + (context.parent + 1),
        });
    }

    return decl;
});