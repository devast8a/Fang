import { builtin } from '../Builtin';
import { Context, Expr, Tag } from '../nodes';

export function inferType(context: Context) {
    for (const node of context.module.nodes) {
        switch (node.tag) {
            case Tag.DeclFunction: {
                node.returnType = (node.returnType.tag === Tag.TypeInfer ? builtin.references.empty : node.returnType);

                for (const variable of node.variables) {
                    // TODO: Redesign variable storage to avoid null check
                    if (variable === null) {
                        continue;
                    }

                    if (variable.type.tag === Tag.TypeInfer) {
                        if (variable.value === null) {
                            throw new Error();
                        } else {
                            variable.type = Expr.getReturnType(context, variable.value);
                        }
                    }
                }
            }
        }
    }
}