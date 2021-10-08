import { Context, DeclVariable, DeclVariableFlags, Expr, ExprDeclaration, ExprGet, ExprId, MutContext, Node, RefLocal, Tag } from '../nodes';

export function flatten(context: Context) {
    const decls = context.module.children.decls;

    for (let id = 0; id < decls.length; id++) {
        const decl = decls[id];

        switch (decl.tag) {
            case Tag.DeclStruct:
            case Tag.DeclTrait:
                continue;

            case Tag.DeclFunction: {
                const ctx = MutContext.fromContext(context.createChildContext(decl.children, id));

                const output = new Array<ExprId>();
                flattenExprs(ctx, output, decl.children.body, true);

                continue;
            }
        }
        
        throw new Error(`transformRemoveNesting>${Tag[decl.tag]}: Not implemented`);
    }
}

function flattenExprs(context: MutContext, output: ExprId[], ids: ReadonlyArray<ExprId>, topLevel = false) {
    const results = [];

    for (let id of ids) {
        id = flattenExpr(context, output, id, topLevel);

        results.push(id);
        output.push(id);
    }

    return results;
}

function flattenExpr(context: MutContext, output: ExprId[], id: ExprId, topLevel = false): ExprId {
    const expr = Expr.get(context, id);

    switch (expr.tag) {
        case Tag.ExprCall: {
            const mutated = Node.mutate(expr, {
                args: flattenExprs(context, output, expr.args),
            });
            context.updateExpr(id, mutated);

            return topLevel ? id : extract(context, output, id, mutated);
        }

        case Tag.ExprConstant: {
            return id;
        }

        case Tag.ExprCreate: {
            return id;
            // return extract(context, output, expr);
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

        case Tag.ExprSet: {
            // expr.value = flatten(context, output, expr.value, topLevel);
            // return topLevel ? expr : extract(context, output, expr);
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