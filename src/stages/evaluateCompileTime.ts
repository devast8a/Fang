import { VisitChildren } from '../ast/VisitChildren';
import { createVisitor } from '../ast/visitor';
import { VirtualMachine } from '../interpret/interpret';
import { ExprConstant, RefGlobal, Tag } from '../nodes';

export const evaluateCompileTime = createVisitor(VisitChildren, (context, expr, id, state) => {
    switch (expr.tag) {
        case Tag.ExprCall: {
            if (!expr.compileTime) {
                return expr;
            }

            const vm = new VirtualMachine(context.module);
            const value = vm.call((expr.target as RefGlobal).id);

            return new ExprConstant(null as any, value);
        }
    }

    return expr;
});