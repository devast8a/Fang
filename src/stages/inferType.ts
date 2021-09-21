import { builtin } from '../Builtin';
import { Context, Tag } from '../nodes';

export function inferType(context: Context) {
    for (const node of context.module.nodes) {
        switch (node.tag) {
            case Tag.DeclFunction: {
                node.returnType = (node.returnType.tag === Tag.TypeInfer ? builtin.empty : node.returnType);
            }
        }
    }
}