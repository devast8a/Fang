import { VisitChildren } from '../ast/VisitChildren';
import { createVisitor } from '../ast/visitor';
import { Context, Decl, Node, Tag, RootId } from '../nodes';
import { isBuiltin } from '../targets/targetC';

export const mangleNames = createVisitor(VisitChildren, (context, decl) => {
    // TODO: Cache results
    if (decl.tag === Tag.DeclFunction && !isBuiltin(context, decl)) {
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