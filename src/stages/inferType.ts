import { builtin } from '../Builtin';
import { Compiler } from '../compile';
import { Context, Tag } from '../nodes';

export function inferType(compiler: Compiler, context: Context) {
    for (const node of context.module.nodes) {
        switch (node.tag) {
            case Tag.DeclFunction: {
                node.returnType = builtin.empty;
            }
        }
    }

    // HACK: Remove when we fix stages
    return context.module.nodes;
}