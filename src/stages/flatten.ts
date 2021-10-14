import { Context, DeclVariable, DeclVariableFlags, Expr, ExprDeclaration, ExprGet, ExprId, MutContext, Node, RefLocal, Tag } from '../nodes';

export function flatten(context: Context) {
    const decls = context.module.children.decls;

    for (let id = 0; id < decls.length; id++) {
        const decl = decls[id];

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
    const expr = Expr.get(context, id);

    switch (expr.tag) {
        case Tag.ExprCall: {
            context.updateExpr(id, Node.mutate(expr, {
                args: flattenExprs(context, output, expr.args),
            }));

            return topLevel ? id : extract(context, output, id, expr);
        }

        case Tag.ExprConstant: {
            return id;
        }

        case Tag.ExprCreate: {
            return id;
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

        case Tag.ExprReturn: {
            return id;
        }

        case Tag.ExprSet: {
            context.updateExpr(id, Node.mutate(expr, {
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
    const {decls, exprs} = context.container;

    const variableId = decls.length;
    const variable = new DeclVariable(
        `FZ_${variableId}`,
        Expr.getReturnType(context, expr),
        id,
        DeclVariableFlags.None
    );
    decls.push(variable);
    
    const declId = exprs.length;
    const decl = new ExprDeclaration(new RefLocal(variableId));
    exprs.push(decl);

    const getId = exprs.length;
    const get = new ExprGet(new RefLocal(variableId))
    exprs.push(get);

    output.push(declId);
    return getId;
}