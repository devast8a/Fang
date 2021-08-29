import { Expr, Node, Tag, Type, Function } from '../nodes';

export function checkTypeNode(node: Node, context: Function) {
    switch (node.tag) {
        case Tag.Trait:
        case Tag.Class:
            console.warn(`checkTypeNode>${Tag[node.tag]} not implemented.`);
            return;

        case Tag.Function: {
            checkTypeNodes(node.body, node);
            return;
        }

        case Tag.ExprCallStatic: {
            if (node.target.tag !== Tag.Function) {
                console.warn(`Unresolved ${node.target.name}`);
                return;
            }

            for (let i = 0; i < node.args.length; i++) {
                const arg = node.args[i];
                const param = node.target.parameters[i];
                
                const argType = Expr.getReturnType(arg, context);

                if (!Type.canAssignTo(argType, param.type)) {
                    console.log(argType, param.type);
                    throw new Error('');
                }
            }

            return;
        }
    }

    throw new Error(`checkTypeNode: No case for node '${Tag[node.tag]}'`);
}

export function checkTypeNodes(nodes: Node[], context: Function) {
    for (const node of nodes) {
        checkTypeNode(node, context);
    }
}