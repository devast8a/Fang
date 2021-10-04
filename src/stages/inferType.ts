import { builtin } from '../Builtin';
import { Context, Expr, Tag } from '../nodes';

export function inferType(context: Context) {
    for (const node of context.module.nodes) {
        switch (node.tag) {
            case Tag.DeclFunction: {
                node.returnType = (node.returnType.tag === Tag.TypeInfer ? builtin.references.empty : node.returnType);

                for (const child of node.children.decls) {
                    if (child.tag !== Tag.DeclVariable) {
                        continue;
                    }

                    if (child.type.tag === Tag.TypeInfer) {
                        if (child.value === null) {
                            throw new Error();
                        } else {
                            child.type = Expr.getReturnType(context, child.value);
                        }
                    }
                }
            }
        }
    }
}