import { VisitChildren } from '../ast/VisitChildren';
import { createVisitor } from '../ast/visitor';
import { Expr, Tag, Type } from '../nodes';

export const checkTypes = createVisitor(VisitChildren, (context, node, id, state) => {
    switch (node.tag) {
        case Tag.DeclVariable: {
            if (node.value !== null) {
                const source = Expr.get(context, node.value)
                const sourceType = Expr.getReturnType(context, source);

                if (!Type.canAssignTo(sourceType, node.type)) {
                    context.error(new AssignmentError(0));
                }
            }
        }
    }

    return node;
});

class AssignmentError {
    public constructor(
        public source: number,
    ) { }
}