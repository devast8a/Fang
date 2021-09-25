import { VisitChildren } from '../ast/VisitChildren';
import { createVisitor } from '../ast/visitor';

export const checkType = createVisitor(VisitChildren, (node, context) => {
    return node;
});