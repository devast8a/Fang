import { Visitor } from '../ast/visitor';
import { Tag } from '../nodes';

export const transformInferType = new Visitor({
    after: (node) => {
        switch (node.tag) {
            case Tag.DeclVariable: {
                // if (node.type.tag === Tag.TypeInfer && node.value !== null) {
                //     node.type = Node.getReturnType(node.value, null as any)
                // }

                return node;
            }

            case Tag.DeclFunction: {
                // node.returnType = node.returnType.tag === Tag.TypeInfer ? builtin.empty : node.returnType;
                return node;
            }

            default: {
                return node;
            }
        }

        throw new Error(`transformInferTypes: No implementation for Node ${Tag[node.tag]}`);
    }
});