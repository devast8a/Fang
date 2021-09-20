import { Visitor } from '../ast/visitor';
import { Tag, DeclFunction, Node, Type, Context } from '../nodes';

export const resolveOverload = new Visitor({
    after: (node, context) => {
        switch (node.tag) {
            case Tag.ExprCallStatic: {
                const target = context.resolve(node.target);

                if (target.tag !== Tag.SymbolSet) {
                    break;
                }

                let candidates = target.nodes as DeclFunction[];
                candidates = candidates.filter(candidate =>
                    isCandidateOverload(context, node.args, candidate),
                );

                switch (candidates.length) {
                    case 0:  throw new Error('No overload matches!')
                    case 1:  node.target = candidates[0].id; break;
                    default: throw new Error('Ambiguous overload matches!');
                }
            }
        }

        return node;
    }
});

function isCandidateOverload(context: Context, args: Node[], candidate: DeclFunction) {
    const params = candidate.parameters;
    
    // TODO[dev]: Support variadic functions
    if (args.length !== params.length) {
        return false;
    }

    for (let i = 0; i < args.length; i++) {
        const arg   = Node.getReturnType(context, args[i]);
        const param = params[i].type;

        if (!Type.canAssignTo(arg, param)) {
            return false;
        }
    }

    return true;
}