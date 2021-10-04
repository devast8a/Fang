import { VisitChildren } from '../ast/VisitChildren';
import { createVisitor } from '../ast/visitor';
import { Tag, DeclFunction, Expr, Type, Context } from '../nodes';

export const resolveOverload = createVisitor(VisitChildren, (node, context) => {
    switch (node.tag) {
        case Tag.ExprCallStatic: {
            const target = context.resolveGlobal(node.target);

            if (target.tag !== Tag.DeclSymbol) {
                break;
            }

            // Resolve and check?
            let candidates = target.nodes.map(id => {return {id: id as number, function: context.resolveGlobal(id, DeclFunction)}});
            candidates = candidates.filter(candidate =>
                isCandidateOverload(context, node.args, candidate.function),
            );

            switch (candidates.length) {
                case 0:  throw new Error('No overload matches!')
                case 1:  node.target = candidates[0].id; break;
                default: throw new Error('Ambiguous overload matches!');
            }
        }
    }

    return node;
});

function isCandidateOverload(context: Context, args: Expr[], candidate: DeclFunction) {
    const params = candidate.variables.slice(0, candidate.parameters);
    
    // TODO[dev]: Support variadic functions
    if (args.length !== params.length) {
        return false;
    }

    for (let i = 0; i < args.length; i++) {
        const arg   = Expr.getReturnType(context, args[i]);
        const param = params[i].type;

        if (!Type.canAssignTo(context, arg, param)) {
            return false;
        }
    }

    return true;
}