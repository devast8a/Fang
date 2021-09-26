import { VisitChildren } from '../ast/VisitChildren';
import { createVisitor, VisitorControl } from '../ast/visitor';
import { Flags } from '../common/flags';
import * as Nodes from '../nodes';
import { Context, DeclFunction, DeclVariable, Expr, FunctionFlags, Node, Tag } from '../nodes';
import { isAbstractType } from './markAbstractFunctions';

function FilterAbstractFunctions<State>(node: Node, context: Context, state: State, control: VisitorControl<State>) {
    const {next} = control;

    if (node.tag !== Tag.DeclFunction) {
        return next(node, context, state);
    }

    if (!Flags.has(node.flags, FunctionFlags.Abstract)) {
        return next(node, context, state);
    }

    // Don't pass through to the rest of the visitors
    return node;
}

export const transformInstantiate = createVisitor(FilterAbstractFunctions, VisitChildren, (node, context, state) => {
    switch (node.tag) {
        case Tag.ExprCallStatic: {
            const target = context.resolveGlobal(node.target);

            if (target.tag !== Tag.DeclFunction) {
                throw new Error('Expecting target to be resolved to DeclFunction');
            }

            if (!Flags.has(target.flags, FunctionFlags.Abstract)) {
                return node;
            }

            const {id} = instantiate(context, target, node.args);

            return new Nodes.ExprCallStatic(id, node.args);
        }
    }

    return node;
});

// TODO: Instantiate using multiple parameters
// TODO: Execute transformInstantiate over the now instantiated function
// TODO: Memoize instantiations
function instantiate(context: Context, fn: DeclFunction, args: Expr[]) {
    const parameters = fn.parameters.map((parameter, index) => {
        const type = isAbstractType(context, parameter.type) ?
            Expr.getReturnType(context, args[index]) :
            parameter.type

        return new DeclVariable(parameter.parent, parameter.name, type, parameter.value, parameter.flags);
    });

    // Instantiate a new copy of the function
    const returnType = fn.returnType;
    const flags      = Flags.unset(fn.flags, FunctionFlags.Abstract);
    const body       = fn.body; 

    const concreteFn = new DeclFunction(fn.parent, "", parameters, returnType, body, flags);
    concreteFn.variables = parameters.concat(fn.variables.slice(parameters.length));

    const id = context.register(concreteFn);

    concreteFn.name = `${fn.name}_${id}`;

    return {
        id: id,
        fn: concreteFn,
    };
}