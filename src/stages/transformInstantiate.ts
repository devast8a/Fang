import { Visitor } from '../ast/visitor';
import { Flags } from '../common/flags';
import { FunctionFlags, Tag, DeclFunction, DeclVariable, Node, ExprCallStatic, UnresolvedId, Context, Type } from '../nodes';

export const transformInstantiate = new Visitor({
    before: (node) => {
        if (node.tag === Tag.DeclFunction && Flags.has(node.flags, FunctionFlags.Abstract)) {
            return {continue: false};
        }
        return {continue: true};
    },

    after: (node, context) => {
        switch (node.tag) {
            case Tag.ExprCallStatic: {
                // if (node.target.tag !== Tag.DeclFunction || !Flags.has(node.target.flags, FunctionFlags.Abstract)) {
                //     return node;
                // }

                // Otherwise we need to instantiate
                const target = context.module.nodes[node.target as number] as DeclFunction;
                const fn = instantiate(context.next(target), node.args);
                return new ExprCallStatic(fn.id, node.args);
            }
        }

        return node;
    }
});

function nodeToPath(node: Node) {
    // TODO[dev]: Switch to numeric id for all nodes
    // TODO[dev]: Path should contain entire path
    switch (node.tag) {
        case Tag.DeclStruct:     return node.name;
        case Tag.DeclTrait:     return node.name;
        case Tag.DeclFunction:  return node.name;
        default: throw new Error(`nodeToPath > ${Tag[node.tag]} unsupported`);
    }
}

// Create a unique identifier
function generateId(context: Context<DeclFunction>, args: Node[]) {
    const fn = context.parent;
    const id = [nodeToPath(fn)];

    const params = fn.parameters;
    for (let index = 0; index < args.length; index++) {
        const arg   = args[index];
        const param = params[index];

        if (Type.is(context, param.type, Tag.DeclTrait)) {
            continue;
        }

        const type = Node.getReturnType(context, arg);
        id.push(nodeToPath(type));
    }

    return id.join("$");
}

function instantiate(context: Context<DeclFunction>, args: Node[]) {
    const id = generateId(context, args)
    
    const fn   = context.parent;
    const type = Node.getReturnType(context, args[0]);

    // Instantiate a new copy of the function
    const variables = fn.variables.map(variable => new DeclVariable(
        UnresolvedId,
        variable.id,

        variable.name,
        type,
        variable.value,
        variable.flags,
    ));

    const returnType = fn.returnType;
    const parameters = variables.slice(0, fn.parameters.length);

    const flags = Flags.unset(fn.flags, FunctionFlags.Abstract);

    // Set id correctly
    const output = new DeclFunction(
        UnresolvedId,
        UnresolvedId,

        id,
        parameters,
        returnType,
        [],
        flags
    );

    output.variables = variables;
    output.body = transformInstantiate.array(fn.body, context.next(output), null);

    context.module.nodes.push(output);

    return output;
}