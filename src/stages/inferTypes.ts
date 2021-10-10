import { VisitChildren } from '../ast/VisitChildren';
import { createVisitor } from '../ast/visitor';
import { Expr, Node, Tag } from '../nodes';

// TODO: Replace with VisitDecl
export const inferTypes = createVisitor(VisitChildren, (context, node) => {
    switch (node.tag) {
        case Tag.DeclVariable: {
            if (node.type.tag !== Tag.TypeInfer) {
                return node;
            }

            if (node.value === null) {
                // TODO: Create error system
                throw new Error('USER ERROR');
            }

            const value = Expr.get(context, node.value);
            const type = Expr.getReturnType(context, value);
            return Node.mutate(node, { type });
        }
    }

    return node;
});