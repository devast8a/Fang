import { Visitor } from '../ast/visitor';
import { builtin } from '../Builtin';
import { Expr, Tag } from '../nodes';

export const transformInferType = new Visitor((node) => {
    switch (node.tag) {
        case Tag.Variable: {
            if (node.type.tag === Tag.TypeInfer && node.value !== null) {
                node.type = Expr.getReturnType(node.value, null as any)
            }

            return node;
        }

        case Tag.Function: {
            node.returnType = node.returnType.tag === Tag.TypeInfer ? builtin.empty : node.returnType;
            return node;
        }

        default: {
            return node;
        }
    }

    throw new Error(`transformInferTypes: No implementation for Node ${Tag[node.tag]}`);
});