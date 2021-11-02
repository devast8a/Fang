import { VisitChildren } from '../ast/VisitChildren';
import { createVisitor } from '../ast/visitor';
import { IncorrectTypeError, TypeErrors } from '../errors';
import { DeclFunction, DeclVariable, Expr, Node, Tag, Type } from '../nodes';

export const checkTypes = createVisitor(VisitChildren, (context, node, id) => {
    switch (node.tag) {
        case Tag.DeclVariable: {
            if (node.value !== null) {
                const source = context.get(node.value)
                const sourceType = Expr.getReturnType(context, source);

                if (!Type.canAssignTo(context, sourceType, node.type)) {
                    context.error(new IncorrectTypeError(context, node.value, sourceType, id, node.type, id));
                }
            }

            return node;
        }
            
        case Tag.ExprSet: {
             const source = context.get(node.value);
             const sourceType = Expr.getReturnType(context, source);
             const target = context.get(node.target) as DeclVariable;

             if (!Type.canAssignTo(context, sourceType, target.type)) {
                 context.error(new IncorrectTypeError(context, node.value, sourceType, node.target, target.type, id));
             }

             return node;
        }
            
        case Tag.ExprReturn: {
            const ref = context.container.self;
            const fn = Node.as(context.get(ref), DeclFunction);

            if (node.value === null) {
                // TODO: Implement check for void
            } else {
                if (!Type.canAssignTo(context, Expr.getReturnType(context, node), fn.returnType)) {
                    context.error(new TypeErrors.ReturnValue(context, ref, node.value));
                }
            }
        }
    }

    return node;
});