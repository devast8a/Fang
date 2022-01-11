import { VisitChildren } from '../ast/VisitChildren';
import { createVisitor } from '../ast/visitor';
import { VisitRefDecl } from '../ast/VisitRefDecl';
import { VisitType } from '../ast/VisitType';
import { Flags } from '../common/flags';
import { Context, Decl, DeclFunction, DeclFunctionFlags, DeclGenericParameter, DeclStruct, DeclVariable, Expr, ExprCall, MutContext, Node, Ref, RefFieldId, RefGlobal, RefGlobalDecl, Tag, Type, TypeGet, unimplemented, unreachable } from '../nodes';
import { isAbstractType } from './markAbstractFunctions';

export class InstantiateState {
    public substitutions = new Map<Type | Decl, Type | Decl>();
    public memoized = new Map<string, RefGlobal>();
}

export const instantiate = createVisitor<InstantiateState>(VisitChildren, VisitRefDecl, VisitType, (context, node, id, state, control) => {
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
            const oldType = Expr.getReturnType(context, context.get(node.target));
            const target = control.first(context, context.get(node.target), node.target, state);
            const newType = Expr.getReturnType(context, target);

            const name = Type.getMemberName(context, oldType, node.field);
            const newField = Type.getMember(context, newType, name);

            return new RefFieldId(node.target, newField);
        }
            
        case Tag.TypeGenericApply: {
            const target = control.first(context, node.target, -2, state);
            const targetDecl = Node.as(context.get(Node.as(target, TypeGet).target), DeclStruct);

            const type = instantiateStruct(context, state, targetDecl, node.args);
            return new TypeGet(type);
        }
            
        case Tag.TypeGet: {
            const target = context.get(node.target);
            const substitution = state.substitutions.get(target);

            return substitution ?? node;
        }
            
        case Tag.ExprDeclaration: {
            const target = context.get(node.target);

            switch (target.tag) {
                case Tag.DeclStruct:
                case Tag.DeclFunction:
                    return Node.mutate(node, { target: instantiateDecl(context, state, target) });
            }
            return node;
        }
    }

    return node;
});

export function instantiateDecl(ctx: Context, state: InstantiateState, decl: Decl): Ref<Decl> {
    const context = MutContext.fromContext(ctx);

    const children = Node.getChildren(decl);

    if (children === null) {
        throw unreachable("instantiateDecl requires decl to have children");
    }

    // TODO: Setup memoization
    const nodes = children.nodes.slice();

    const newId = context.root.reserve();
    const newContext = MutContext.createFrom(context.getParent()!, newId, children, {
        nodes: nodes
    });

    // Rewrite all children
    for (let index = 0; index < nodes.length; index++) {
        nodes[index] = instantiate(newContext, nodes[index], index, state);
    }

    context.root.update(newId, Node.mutate(decl, {
        children: newContext.finalize(newContext.container.body),
    }));

    return new RefGlobal(context.root.declare(newId));
}

export function instantiateFn(ctx: Context, state: InstantiateState, fn: DeclFunction, call: ExprCall): Ref<DeclFunction> {
    const context = MutContext.fromContext(ctx);

    const key = "FN" + fn.children.self.id + "-" + call.args.map(node => {
        return Node.as(Node.as(Expr.getReturnType(context, context.get(node)), TypeGet).target, RefGlobalDecl).member;
    }).join("-");
    const memoized = state.memoized.get(key);
    if (memoized !== undefined) {
        return memoized;
    }
    const newId = context.root.reserve();
    const ref = new RefGlobal(newId);
    state.memoized.set(key, ref);

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

    const newContext = MutContext.createFrom(context.getParent()!, newId, fn.children, {
        nodes: nodes
    });

    // Rewrite all children
    for (let index = 0; index < nodes.length; index++) {
        nodes[index] = instantiate(newContext, nodes[index], index, state);
    }

    context.root.update(newId, Node.mutate(fn, {
        name: fn.name,
        children: newContext.finalize(newContext.container.body),
        flags: Flags.unset(fn.flags, DeclFunctionFlags.Abstract),
    }));

    return ref;
}

export function instantiateStruct(ctx: Context, state: InstantiateState, struct: DeclStruct, args: readonly Type[]): Ref<DeclStruct> {
    if (struct.generics === null) {
        throw unreachable("Can only call instantiateStruct on a generic structure");
    }

    const context = MutContext.fromContext(ctx);

    // Memoize
    const key = "STRUCT" + struct.children.self.id + "-" + args.map(type => Node.as(Node.as(type, TypeGet).target, RefGlobalDecl).member).join("-");
    const memoized = state.memoized.get(key);
    if (memoized !== undefined) {
        return memoized;
    }
    const newId = context.root.reserve();
    const ref = new RefGlobal(newId);
    state.memoized.set(key, ref);

    const nodes = struct.children.nodes.slice();
    const parameters = struct.generics.parameters;

    // Create substitution rules
    for (let index = 0; index < parameters.length; index++) {
        const parameter = Node.as(nodes[parameters[index]], DeclGenericParameter);
        state.substitutions.set(parameter, args[index]);
    }

    const newContext = MutContext.createFrom(context.getParent()!, newId, struct.children, {
        nodes: nodes
    });

    // Rewrite all children
    for (let index = 0; index < nodes.length; index++) {
        nodes[index] = instantiate(newContext, nodes[index], index, state);
    }

    context.root.update(newId, Node.mutate(struct, {
        name: struct.name,
        children: newContext.finalize(newContext.container.body),
        generics: null, // TODO: Pretty sure we replace this with instantiation data
    }));

    return ref;
}