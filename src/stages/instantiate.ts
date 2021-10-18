import { VisitChildren } from '../ast/VisitChildren';
import { createVisitor, VisitorControl } from '../ast/visitor';
import { Flags } from '../common/flags';
import { Children, Context, DeclFunction, DeclFunctionFlags, DeclVariable, Expr, ExprId, MutContext, Node, Ref, RefGlobalDecl, Storage, Tag } from '../nodes';
import { isAbstractType } from './markAbstractFunctions';

export class InstantiateState {
    private mapping = new Map<string, RefGlobalDecl>();

    public set(key: string, ref: RefGlobalDecl) {
        return this.mapping.set(key, ref);
    }

    public get(key: string): RefGlobalDecl | null {
        return this.mapping.get(key) ?? null;
    }
}

function FilterAbstractFunctions<State>(context: Context, node: Node, id: number, state: State, control: VisitorControl<State>) {
    const {next} = control;

    if (node.tag !== Tag.DeclFunction) {
        return next(context, node, id, state);
    }

    if (!Flags.has(node.flags, DeclFunctionFlags.Abstract)) {
        return next(context, node, id, state);
    }

    // Don't pass through to the rest of the visitors
    return node;
}

export const instantiate = createVisitor<InstantiateState>(FilterAbstractFunctions, VisitChildren, (context, expr, id, state) => {
    switch (expr.tag) {
        case Tag.ExprCall: {
            const target = Node.as(Ref.resolve(context, expr.target), DeclFunction);

            // Non-generic functions do not need instantiation
            if (!Flags.has(target.flags, DeclFunctionFlags.Abstract)) {
                return expr;
            }

            return Node.mutate(expr, {
                target: instantiateFn(MutContext.fromContext(context), state, target, expr.args)
            });
        }
    }

    return expr;
});

function instantiateFn(context: MutContext, state: InstantiateState, fn: DeclFunction, argIds: ReadonlyArray<ExprId>) {
    const args = argIds.map(argId => Expr.get(context, argId));

    // Memoization
    const memoizeKey   = generateId(context, fn, args);
    const memoizeValue = state.get(memoizeKey);

    if (memoizeValue !== null) {
        return memoizeValue;
    }

    const nodes = fn.children.nodes.slice();
    const parameters = fn.parameters;

    for (let index = 0; index < parameters.length; index++) {
        const parameter = Node.as(nodes[parameters[index]], DeclVariable);

        const type = isAbstractType(context, parameter.type) ?
            Expr.getReturnType(context, args[index]) :
            parameter.type;
        
        nodes[index] = Node.mutate(parameter, { type });
    }

    fn = Node.mutate(fn, {
        name: `${fn.name}_${context.module.children.decls.length}`,
        children: new Children(nodes, fn.children.body, fn.children.decls, fn.children.names),
        flags: Flags.unset(fn.flags, DeclFunctionFlags.Abstract),
    });

    return context.root.declare(fn);
}

function generateId(context: Context, fn: DeclFunction, args: Expr[]) {
    const types = args.map(arg => {
        // const type = Expr.getReturnType(context, arg);

        return 0;
    });

    return fn.name + '$' + types.join("$");
}
