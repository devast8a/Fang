import { Context, DeclVariable, DeclVariableFlags, Expr, ExprGet, ExprId, MutContext, Node, RefLocal, Tag } from '../nodes';

export function flatten(context: Context) {
    const {decls, nodes} = context.module.children;

    for (const id of decls) {
        const decl = nodes[id];

        switch (decl.tag) {
            case Tag.DeclStruct:
            case Tag.DeclTrait:
                break;

            case Tag.DeclFunction: {
                const ctx = MutContext.fromContext(context.createChildContext(decl.children, id));

                const output = new Array<ExprId>();

                for (let id of decl.children.body) {
                    id = flattenExpr(ctx, output, id, true);
                    output.push(id);
                }

                (decl.children as any).body = output;

                break;
            }
                
            default: {
                throw new Error(`transformRemoveNesting>${Tag[decl.tag]}: Not implemented`);
            }
        }
    }

    return context.module;
}

function flattenExprs(context: MutContext, output: ExprId[], ids: ReadonlyArray<ExprId>, topLevel = false) {
    const results = [];

    for (let id of ids) {
        id = flattenExpr(context, output, id, topLevel);
        results.push(id);
    }

    return results;
}

function flattenExpr(context: MutContext, output: ExprId[], id: ExprId, topLevel = false): ExprId {
    const expr = context.get(id);

    switch (expr.tag) {
        case Tag.DeclVariable: {
            return id;
        }
            
        case Tag.ExprBody: {
            const body = expr.body;

            for (let index = 0; index < body.length - 1; index++) {
                const id = body[index];
                output.push(flattenExpr(context, output, id, topLevel));
            }

            return flattenExpr(context, output, body[body.length - 1], topLevel);
        }

        case Tag.ExprCall: {
            context.update(id, Node.mutate(expr, {
                args: flattenExprs(context, output, expr.args),
            }));

            return topLevel ? id : extract(context, output, id, expr);
        }

        case Tag.ExprConstant: {
            return id;
        }

        case Tag.ExprCreate: {
            return extract(context, output, id, expr);
        }

        case Tag.ExprDeclaration: {
            return id;
        }

        case Tag.ExprDestroy: {
            return id;
        }

        case Tag.ExprGet: {
            return id;
        }
            
        case Tag.ExprIf: {
            return id;
        }
            
        case Tag.ExprMove: {
            // TODO: 
            return id;
        }

        case Tag.ExprReturn: {
            if (expr.value !== null) {
                context.update(id, Node.mutate(expr, {
                    value: flattenExpr(context, output, expr.value, topLevel)
                }));
            }

            return id;
        }

        case Tag.ExprSet: {
            context.update(id, Node.mutate(expr, {
                value: flattenExpr(context, output, expr.value, topLevel)
            }));

            return id;
        }
            
        case Tag.ExprWhile: {
            return id;
        }
    }

    throw new Error(`Unreachable: Unhandled case ${Tag[(expr as any).tag]}`);
}

function extract(context: MutContext, output: ExprId[], id: ExprId, expr: Expr): ExprId {
    const v = context.add((v) => new DeclVariable(
        `T${v}`,
        Expr.getReturnType(context, expr),
        id,
        DeclVariableFlags.None
    ));
    output.push(v);

    return context.add(new ExprGet(new RefLocal(v)));
}