import { Visitor } from '../ast/visitor';
import { Flags } from '../common/flags';
import { FunctionFlags, Tag, Function, Type, Expr, Variable } from '../nodes';

export const transformInstantiate = new Visitor((node, state) => {
    switch (node.tag) {
        case Tag.ExprCallStatic: {
            // No need to do instantiation here
            if (node.target.tag !== Tag.Function || !Flags.has(node.target.flags, FunctionFlags.Abstract)) {
                return node;
            }

            // Hack to get the current environment
            const fn   = transformInstantiate.functionStack[transformInstantiate.functionStack.length - 1];
            const type = Expr.getReturnType(node.args[0], fn);

            // Otherwise we need to instantiate
            instantiate(node.target, type);

            break;
        }
    }

    return node;
});

function instantiate(fn: Function, arg: Type) {
    const variables = fn.variables.map(variable => new Variable(
        variable.name,
        arg,
        variable.value,
        variable.flags,
        variable.id,
    ));
    const returnType = fn.returnType;
    const parameters = variables.slice(0, fn.parameters.length);

    const output = new Function(fn.name, parameters, returnType, [], Flags.unset(fn.flags, FunctionFlags.Abstract));

    return output;
}