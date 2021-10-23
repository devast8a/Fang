import { VisitChildren } from '../ast/VisitChildren';
import { createVisitor, VisitorControl } from '../ast/visitor';
import { Flags } from '../common/flags';
import { Children, Context, Decl, DeclFunction, DeclFunctionFlags, DeclStruct, DeclVariable, Expr, ExprDeclaration, ExprId, MutChildren, MutContext, Node, RefFieldId, RefGlobal, RefGlobalDecl, RefLocal, Tag, TypeGet } from '../nodes';
import { isAbstractType } from './markAbstractFunctions';

export const instantiate = createVisitor<InstantiateState>(FilterAbstractFunctions, VisitChildren, (context, expr, id, state) => {
    switch (expr.tag) {
        case Tag.ExprCall: {
            const target = Node.as(context.get(expr.target), DeclFunction);

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

export class InstantiateState {
    private mapping = new Map<string, RefGlobalDecl>();

    public set(key: string, ref: RefGlobalDecl) {
        return this.mapping.set(key, ref);
    }

    public get(key: string): RefGlobalDecl | null {
        return this.mapping.get(key) ?? null;
    }
}

function instantiateFn(context: MutContext, state: InstantiateState, fn: DeclFunction, argIds: ReadonlyArray<ExprId>) {
    const args = argIds.map(argId => context.get(argId));

    // TODO: Support memoization

    const nodes = fn.children.nodes.slice();
    const parameters = fn.parameters;

    const t = Expr.getReturnType(context, args[0]);

    // Rewrite parameters
    for (let index = 0; index < parameters.length; index++) {
        const parameter = Node.as(nodes[parameters[index]], DeclVariable);

        const type = isAbstractType(context, parameter.type) ?
            Expr.getReturnType(context, args[index]) :
            parameter.type;
        
        nodes[index] = Node.mutate(parameter, { type });
    }

    // Rewrite body
    for (let index = 0; index < nodes.length; index++) {
        const node = nodes[index];

        switch (node.tag) {
            case Tag.ExprCall: {
                const ref = node.target as RefFieldId;

                const oldType = context.module.children.nodes[ref.targetType] as DeclStruct;
                const fieldName = (context.get((oldType.children.nodes[ref.field] as ExprDeclaration).target) as Decl).name;
                const newTypeId = (t as TypeGet).target as RefLocal;
                const newType = context.get(newTypeId) as DeclStruct;
                const newFieldId = newType.children.names.get(fieldName)![0];
                
                nodes[index] = Node.mutate(node, {
                    target: new RefFieldId(ref.target, newTypeId.id, newFieldId),
                });
            }
        }
    }

    // TODO: This is in preparation for a move that removes Context and renames Children to Context
    const ctx = context.container;

    const id = ctx.root.add((id) => {
        // TODO: Copy body, decls, names rather than referencing
        const children = MutChildren.createAndSet(ctx, id, {
            nodes: nodes,
            body:  fn.children.body as any,
            decls: fn.children.decls as any,
            names: fn.children.names as any,
        });

        return Node.mutate(fn, {
            name: `${fn.name}_${context.module.children.decls.length}`,
            children: children,
            flags: Flags.unset(fn.flags, DeclFunctionFlags.Abstract),
        });
    });

    return new RefGlobal(ctx.root.declare(id));
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
