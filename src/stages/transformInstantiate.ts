import { Visitor } from '../ast/visitor';
import { Flags } from '../common/flags';
import { FunctionFlags, Tag, Function, Variable, Node, Module, ExprCallStatic } from '../nodes';

interface Context {
    // Top level nodes
    topLevel: Node[];
    module: Module,
}

export const transformInstantiate = new Visitor<Context>({
    before: (node) => {
        if (node.tag === Tag.Function && Flags.has(node.flags, FunctionFlags.Abstract)) {
            return {continue: false};
        }
        return {continue: true};
    },

    after: (node, container, context) => {
        switch (node.tag) {
            case Tag.ExprCallStatic: {
                if (node.target.tag !== Tag.Function || !Flags.has(node.target.flags, FunctionFlags.Abstract)) {
                    return node;
                }

                // Otherwise we need to instantiate
                const fn = instantiate(node.target, node.args, container as Function, context);

                return new ExprCallStatic(
                    fn,
                    node.args,
                );
            }
        }

        return node;
    }
});

function nodeToPath(node: Node) {
    // TODO[dev]: Switch to numeric id for all nodes
    // TODO[dev]: Path should contain entire path
    switch (node.tag) {
        case Tag.Class:     return node.name;
        case Tag.Trait:     return node.name;
        case Tag.Function:  return node.name;
        default: throw new Error(`nodeToPath > ${Tag[node.tag]} unsupported`);
    }
}

// Create a unique identifier
function generateId(fn: Function, args: Node[], container: Function) {
    const id = [nodeToPath(fn)];

    const params = fn.parameters;
    for (let index = 0; index < args.length; index++) {
        const arg   = args[index];
        const param = params[index];

        if (param.type.tag !== Tag.Trait) {
            continue;
        }

        const type = Node.getReturnType(arg, container);
        id.push(nodeToPath(type));
    }

    return id.join("$");
}

function instantiate(fn: Function, args: Node[], container: Function, context: Context) {
    const id = generateId(fn, args, container)

    const type = Node.getReturnType(args[0], container);

    // Instantiate a new copy of the function
    const variables = fn.variables.map(variable => new Variable(
        variable.name,
        type,
        variable.value,
        variable.flags,
        variable.id,
    ));
    const returnType = fn.returnType;
    const parameters = variables.slice(0, fn.parameters.length);

    const flags = Flags.unset(fn.flags, FunctionFlags.Abstract);

    const output = new Function(id, parameters, returnType, [], flags);
    output.variables = variables;
    output.body = transformInstantiate.array(fn.body, output, context);

    context.topLevel.push(output);

    return output;
}