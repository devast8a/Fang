import { Visitor } from '../ast/visitor';
import { Tag, Function, Node, Type } from '../nodes';

export const resolveOverload = new Visitor({
    after: (node, container) => {
        switch (node.tag) {
            case Tag.ExprCallStatic: {
                if (node.target.tag !== Tag.SymbolSet) {
                    break;
                }

                let candidates = node.target.nodes as Function[];
                candidates = candidates.filter(candidate =>
                    isCandidateOverload(node.args, candidate, container as Function)
                );

                switch (candidates.length) {
                    case 0:  throw new Error('No overload matches!')
                    case 1:  node.target = candidates[0]; break;
                    default: throw new Error('Ambiguous overload matches!');
                }
            }
        }

        return node;
    }
});

function isCandidateOverload(args: Node[], candidate: Function, context: Function) {
    const params = candidate.parameters;
    
    // TODO[dev]: Support variadic functions
    if (args.length !== params.length) {
        return false;
    }

    for (let i = 0; i < args.length; i++) {
        const arg   = Node.getReturnType(args[i], context);
        const param = params[i].type;

        if (!Type.canAssignTo(arg, param)) {
            return false;
        }
    }

    return true;
}