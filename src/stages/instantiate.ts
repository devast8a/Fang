import { VisitChildren } from '../ast/VisitChildren';
import { createVisitor } from '../ast/visitor';
import { Flags } from '../common/flags';
import { Context, DeclFunction, DeclFunctionFlags, DeclVariable, Expr, ExprCall, Module, MutContext, MutModule, Node, NodeId, Ref, RefFieldId, RefGlobal, Tag, Type, unreachable } from '../nodes';
import { isAbstractType } from './markAbstractFunctions';

export class InstantiateState {

}

export const instantiate = createVisitor<InstantiateState>(VisitChildren, (context, node, id, state, control) => {
    switch (node.tag) {
        case Tag.ExprCall: {
            const fn = context.get(node.target);

            if (Flags.all(fn.flags, DeclFunctionFlags.Abstract)) {
                return Node.mutate(node, {
                    target: instantiateFn(context, state, fn, node),
                });
            }

            return node;
        }
            
        case Tag.RefFieldId: {
            control.first(context, context.get(node.target), node.target, state);

            // TODO: Actually implement the member lookup correctly
            //const type = Expr.getReturnType(context, context.get(target));
            //const field = Type.getMember(context, type, 'foobar');

            return new RefFieldId(node.target, node.field);
        }
    }

    return node;
});

export function instantiateFn(ctx: Context, state: InstantiateState, fn: DeclFunction, call: ExprCall): Ref<DeclFunction> {
    const context = MutContext.fromContext(ctx);

    // TODO: Setup memoization
    const args = call.args.map(id => context.get(id));

    const nodes = fn.children.nodes.slice();
    const parameters = fn.parameters;

    // Rewrite parameters
    for (let index = 0; index < parameters.length; index++) {
        const parameter = Node.as(nodes[parameters[index]], DeclVariable);

        const type = isAbstractType(context, parameter.type) ?
            Expr.getReturnType(context, args[index]) :
            parameter.type;
        
        nodes[index] = Node.mutate(parameter, { type });
    }

    const newId = context.root.reserve();
    const newContext = MutContext.createFrom(context.getParent()!, newId, fn.children, {
        nodes: nodes
    });

    // Rewrite all children
    for (let index = 0; index < nodes.length; index++) {
        nodes[index] = instantiate(newContext, nodes[index], index, state);
    }

    context.root.update(newId, Node.mutate(fn, {
        name: `${fn.name}_${context.root.container.decls.length}`,
        children: newContext.finalize(newContext.container.body),
        flags: Flags.unset(fn.flags, DeclFunctionFlags.Abstract),
    }));

    return new RefGlobal(context.root.declare(newId));
}