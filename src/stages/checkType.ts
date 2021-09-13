import { Visitor } from '../ast/visitor';
import { Node, Tag, Type, Function } from '../nodes';

export const checkType = new Visitor({
    after: (node, container) => {
        // TODO: Verify
        const context = container as Function;

        switch (node.tag) {
            case Tag.Variable: {
                if (node.value === null) {
                    return node;
                }

                const valueType = Node.getReturnType(node.value, context);

                if (!Type.canAssignTo(valueType, node.type)) {
                    throw new Error("Can't assign type");
                }

                return node;
            }

            case Tag.ExprCallStatic: {
                if (node.target.tag !== Tag.Function) {
                    console.warn(`Unresolved ${node.target}`);
                    return node;
                }

                for (let i = 0; i < node.args.length; i++) {
                    const arg = node.args[i];
                    const param = node.target.parameters[i];
                    
                    const argType = Node.getReturnType(arg, context);

                    if (!Type.canAssignTo(argType, param.type)) {
                        console.log(arg, argType, param.type)
                        throw new Error("Can't assign type");
                    }
                }
                return node;
            }

            case Tag.ExprSetLocal: {
                const local = context.variables[node.local as number];
                const valueType = Node.getReturnType(node.value, context);

                if (!Type.canAssignTo(valueType, local.type)) {
                    throw new Error("Can't assign type");
                }
                return node;
            }
        }

        return node;
    }
});