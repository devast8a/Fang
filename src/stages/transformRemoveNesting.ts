import { Node, Tag, Function, Variable, VariableFlags, ExprGetLocal } from '../nodes';

export function transformRemoveNesting(nodes: Node[]) {
    for (const node of nodes) {
        switch (node.tag) {
            case Tag.Class:
            case Tag.Trait:
                continue;

            case Tag.Function: {

                const output = new Array<Node>();
                for (const stmt of node.body) {
                    transform(node, output, stmt);
                    output.push(stmt);
                }
                node.body = output;

                continue;
            }
        }
        
        throw new Error(`transformRemoveNesting>${Tag[node.tag]}: Not implemented`);
    }
}

function transform(fn: Function, output: Node[], node: Node): Node {
    switch (node.tag) {
        case Tag.Variable: {
            if (node.value !== null) {
                node.value = transform(fn, output, node.value);
            }
            return node;
        }

        case Tag.ExprConstruct: {
            return node;
        }

        case Tag.ExprCallStatic: {
            for (let index = 0; index < node.args.length; index++) {
                const arg = node.args[index];

                switch (arg.tag) {
                    case Tag.ExprCallStatic: {
                        transform(fn, output, arg);
                        node.args[index] = useTemporaryVariable(fn, output, arg);
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

        case Tag.StmtDelete: {
            return node;
        }
    }

    throw new Error(`transformRemoveNesting > transform > ${Tag[node.tag]}: Not implemented`);
}

function useTemporaryVariable(fn: Function, output: Node[], value: Node): Node {
    const id = fn.variables.length;

    const variable = new Variable(
        // TODO: Variable naming
        `_temp${fn.variables.length}`,
        Node.getReturnType(value, fn),
        value,
        // TODO: Might need to apply more flags
        VariableFlags.Local,
        id,
    );
    fn.variables.push(variable);
    output.push(variable);

    return new ExprGetLocal(id);
}