import { VisitChildren } from '../ast/VisitChildren';
import { createVisitor, VisitorControl } from '../ast/visitor';
import { Flags } from '../common/flags';
import * as Nodes from '../nodes';
import { Context, DeclFunction, DeclVariable, Expr, FunctionFlags, Node, Tag } from '../nodes';
import { isAbstractType } from './markAbstractFunctions';

export class InstantiateState {
    private mapping = new Map<string, number>();

    public set(key: string, id: number) {
        return this.mapping.set(key, id);
    }

    public get(key: string): number | null {
        return this.mapping.get(key) ?? null;
    }
}

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

export const transformInstantiate = createVisitor<InstantiateState>(FilterAbstractFunctions, VisitChildren, (node, context, state) => {
    switch (node.tag) {
        case Tag.ExprCallStatic: {
            const target = context.resolveGlobal(node.target);

            if (target.tag !== Tag.DeclFunction) {
                throw new Error('Expecting target to be resolved to DeclFunction');
            }

            if (!Flags.has(target.flags, FunctionFlags.Abstract)) {
                return node;
            }

            const id = instantiate(context, state, target, node.args);

            return new Nodes.ExprCallStatic(id, node.args);
        }
    }

    return node;
});

function instantiate(context: Context, state: InstantiateState, fn: DeclFunction, args: Expr[]) {
    // Memoization
    const memoizeKey   = generateId(context, fn, args);
    const memoizeValue = state.get(memoizeKey);

    if (memoizeValue !== null) {
        return memoizeValue;
    }

    // Rewrite parameters
    const parameters = fn.parameters.map((parameter, index) => {
        const type = isAbstractType(context, parameter.type) ?
            Expr.getReturnType(context, args[index]) :
            parameter.type

        return new DeclVariable(parameter.parent, parameter.name, type, parameter.value, parameter.flags);
    });

    const variables = fn.variables.slice(parameters.length).map((variable) => {
        // TODO: Redesign variable storage to avoid null check
        if (variable === null) {
            return variable;
        }

        return new DeclVariable(variable.parent, variable.name, variable.type, variable.value, variable.flags);
    })

    // Instantiate a new copy of the function
    const returnType = fn.returnType;
    const flags      = Flags.unset(fn.flags, FunctionFlags.Abstract);
    const body       = fn.body; 

    // TODO: Repair field lookups etc...
    const concreteFn = new DeclFunction(fn.parent, "", parameters, returnType, body, flags);
    concreteFn.variables = parameters.concat(variables);
    const id = context.register(concreteFn);
    concreteFn.name = `${fn.name}_${id}`;

    // TODO: Simplify invocations like this.
    context.module.nodes[id] = transformInstantiate(concreteFn, context.nextId2(Nodes.RootId, id), state);

    state.set(memoizeKey, id);
    return id;
}

function generateId(context: Context, fn: DeclFunction, args: Expr[]) {
    const types = args.map(arg => {
        const type = Expr.getReturnType(context, arg);

        switch (type.tag) {
            case Tag.TypeRefStatic: return type.member;
            default: throw new Error("generateId - node type not supported");
        }
    });

    return fn.name + '$' + types.join("$");
}
