import { Node, Tag, DeclFunction, DeclVariable, VariableFlags, ExprGetLocal, UnresolvedId, Context, Expr } from '../nodes';

export function transformRemoveNesting(context: Context) {
    const nodes = context.module.nodes;

    for (let id = 0; id < nodes.length; id++) {
        const node = nodes[id];

        switch (node.tag) {
            case Tag.DeclStruct:
            case Tag.DeclTrait:
            case Tag.DeclSymbol:
                continue;

            case Tag.DeclFunction: {

                const output = new Array<Expr>();
                for (const stmt of node.body) {
                    transform(context.nextId(id), output, stmt);
                    output.push(stmt);
                }
                node.body = output;

                continue;
            }
        }
        
        throw new Error(`transformRemoveNesting>${Tag[node.tag]}: Not implemented`);
    }
}

function transform(context: Context<DeclFunction>, output: Expr[], node: Node): Expr {
    switch (node.tag) {
        // case Tag.DeclVariable: {
        //     if (node.value !== null) {
        //         node.value = transform(context, output, node.value);
        //     }
        //     return node;
        // }

        case Tag.ExprDeclaration: {
            return node;
        }

        case Tag.ExprConstruct: {
            return node;
        }

        case Tag.ExprCallField: {
            // TODO: Removing nesting as with ExprCallStatic
            return node;
        }

        case Tag.ExprCallStatic: {
            for (let index = 0; index < node.args.length; index++) {
                const arg = node.args[index];

                switch (arg.tag) {
                    case Tag.ExprCallStatic: {
                        transform(context, output, arg);
                        node.args[index] = useTemporaryVariable(context, output, arg);
                        break;
                    }

                    // Don't need to remove nesting
                    case Tag.ExprGetLocal:
                        break;

                    default:
                        throw new Error(`transformRemoveNesting > transform > ExprCallStatic > ${Tag[arg.tag]}: Not implemented`);
                }
            }
            return node;
        }

        case Tag.ExprDestroyLocal: {
            return node;
        }
    }

    throw new Error(`transformRemoveNesting > transform > ${Tag[node.tag]}: Not implemented`);
}

function useTemporaryVariable(context: Context<DeclFunction>, output: Node[], value: Expr): Expr {
    const fn = context.parent;
    const id = fn.variables.length;

    const variable = new DeclVariable(
        // TODO: Set parent ID correctly
        UnresolvedId,

        // TODO: Variable naming
        `_temp${fn.variables.length}`,

        Expr.getReturnType(context, value),
        value,

        // TODO: Might need to apply more flags
        VariableFlags.Local,
    );
    fn.variables.push(variable);
    output.push(variable);

    return new ExprGetLocal(id);
}