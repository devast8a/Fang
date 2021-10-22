import { VisitChildren } from '../ast/VisitChildren';
import { createVisitor } from '../ast/visitor';
import { Context, Expr, RefAny, Tag, Type } from '../nodes';

export const checkTypes = createVisitor(VisitChildren, (context, node, id, state) => {
    switch (node.tag) {
        case Tag.DeclVariable: {
            if (node.value !== null) {
                const source = Expr.get(context, node.value)
                const sourceType = Expr.getReturnType(context, source);

                if (!Type.canAssignTo(sourceType, node.type)) {
                    context.error(new AssignmentError(context, node.value, sourceType, id, node.type, id));
                }
            }
        }
    }

    return node;
});

export class AssignmentError {
    public constructor(
        public context: Context,
        public source: RefAny,
        public sourceType: Type,
        public destination: RefAny,
        public destinationType: Type,
        public assignment: RefAny,
    ) { }
}