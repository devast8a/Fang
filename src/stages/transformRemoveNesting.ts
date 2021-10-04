import { Tag, DeclFunction, DeclVariable, VariableFlags, ExprGetLocal, Context, Expr, ExprDeclaration, UnresolvedId } from '../nodes';

export function transformRemoveNesting(context: Context) {
    const nodes = context.module.nodes;

    for (let id = 0; id < nodes.length; id++) {
        const node = nodes[id];

        switch (node.tag) {
            case Tag.DeclImport:
            case Tag.DeclStruct:
            case Tag.DeclSymbol:
            case Tag.DeclTrait:
                continue;

            case Tag.DeclFunction: {
                const childContext = context.nextId<DeclFunction>(id)

                const output = new Array<Expr>();
                for (let stmt of node.body) {
                    stmt = flatten(childContext, output, stmt, true);
                    output.push(stmt);
                }
                node.body = output;

                continue;
            }
        }
        
        throw new Error(`transformRemoveNesting>${Tag[node.tag]}: Not implemented`);
    }
}

function flatten(context: Context<DeclFunction>, output: Expr[], expr: Expr, topLevel = false): Expr {
    switch (expr.tag) {
        // case Tag.DeclVariable: {
        //     if (node.value !== null) {
        //         node.value = transform(context, output, node.value);
        //     }
        //     return node;
        // }

        case Tag.ExprDeclaration: {
            return expr;
        }

        case Tag.ExprConstruct: {
            return extract(context, output, expr);
        }

        case Tag.ExprConstant: {
            return expr;
        }

        case Tag.ExprDestroyLocal: {
            return expr;
        }

        case Tag.ExprCallField: {
            // TODO: Removing nesting as with ExprCallStatic
            return expr;
        }

        case Tag.ExprCallStatic: {
            expr.args = flattenMany(context, output, expr.args);
            return topLevel ? expr : extract(context, output, expr);
        }

        case Tag.ExprGetField: {
            expr.object = flatten(context, output, expr.object, topLevel);
            return expr;
        }

        case Tag.ExprGetLocal: {
            return expr;
        }

        case Tag.ExprSetLocal: {
            expr.value = flatten(context, output, expr.value, topLevel);
            return topLevel ? expr : extract(context, output, expr);
        }

        case Tag.ExprSetField: {
            expr.value = flatten(context, output, expr.value, true);
            return topLevel ? expr : extract(context, output, expr);
        }

        case Tag.ExprReturn: {
            if (expr.expression !== null) {
                expr.expression = flatten(context, output, expr.expression);
            }

            return expr;
        }
    }

    throw new Error(`transformRemoveNesting > transform > ${Tag[expr.tag]}: Not implemented`);
}

function flattenMany(context: Context<DeclFunction>, output: Expr[], exprs: Expr[]): Expr[] {
    return exprs.map(expr => flatten(context, output, expr));
}

function extract(context: Context<DeclFunction>, output: Expr[], value: Expr): Expr {
    const fn = context.parent;
    const id = fn.variables.length;

    const variable = new DeclVariable(
        context.parentId,
        `FZ_${fn.variables.length}`,
        Expr.getReturnType(context, value),
        value,
        VariableFlags.Local,
    );
    fn.variables.push(variable);
    output.push(new ExprDeclaration(UnresolvedId, context.parentId, fn.variables.length - 1));

    return new ExprGetLocal(UnresolvedId, id);
}