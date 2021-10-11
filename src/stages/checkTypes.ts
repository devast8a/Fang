import { VisitChildren } from '../ast/VisitChildren';
import { createVisitor } from '../ast/visitor';
import { Context, Decl, Expr, Ref, Tag, Type } from '../nodes';

export const checkTypes = createVisitor(VisitChildren, (context, node, id, state) => {
    switch (node.tag) {
        case Tag.DeclVariable: {
            if (node.value !== null) {
                const source = Expr.get(context, node.value)
                const sourceType = Expr.getReturnType(context, source);

                if (!Type.canAssignTo(sourceType, node.type)) {
                    context.error(new AssignmentError(
                        context,
                        Expr.idToRef(context, node.value), sourceType,
                        Decl.idToRef(context, id), node.type,
                        Decl.idToRef(context, id),
                    ));
                }
            }
        }
    }

    return node;
});

export class AssignmentError {
    public constructor(
        public context: Context,
        public source: Ref,
        public sourceType: Type,
        public destination: Ref,
        public destinationType: Type,
        public assignment: Ref,
    ) { }
}