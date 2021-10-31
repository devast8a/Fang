import { VisitChildren } from '../ast/VisitChildren';
import { createVisitor, VisitorControl } from '../ast/visitor';
import { VisitType } from '../ast/VisitType';
import { Flags } from '../common/flags';
import { Context, Decl, DeclFunction, DeclFunctionFlags, DeclStruct, DeclVariable, Expr, ExprDeclaration, ExprId, GenericData, MutContext, Node, Ref, RefFieldId, RefGlobal, RefGlobalDecl, RefLocal, Tag, Type, TypeGet } from '../nodes';
import { isAbstractType } from './markAbstractFunctions';

export const instantiate = createVisitor<InstantiateState>(FilterAbstractFunctions, VisitChildren, VisitType, (context, node, id, state) => {
    switch (node.tag) {
        case Tag.ExprCall: {
            const target = context.get(node.target);

            // Non-generic functions do not need instantiation
            if (!Flags.has(target.flags, DeclFunctionFlags.Abstract)) {
                return node;
            }

            return Node.mutate(node, {
                target: instantiateFn(MutContext.fromContext(context), state, target, node.args)
            });
        }
            
        case Tag.TypeGenericApply: {
            const target = context.get(Node.as(node.target, TypeGet).target);

            const instantiated = instantiateType(MutContext.fromContext(context), state, target as DeclStruct, node.args);

            return new TypeGet(instantiated);
        }
            
        case Tag.TypeGet: {
            const ref = node.target;

            if (ref.tag === Tag.RefLocal) {
                const type = state.replaceMap.get(`${context.container.parent}.${ref.id}`);

                if (type !== undefined) {
                    return type;
                }
            }

            return node;
        }
    }

    return node;
});

export class InstantiateState {
    private mapping = new Map<string, RefGlobalDecl>();
    public replaceMap = new Map<string, Type>();

    public set(key: string, ref: RefGlobalDecl) {
        return this.mapping.set(key, ref);
    }

    public get(key: string): RefGlobalDecl | null {
        return this.mapping.get(key) ?? null;
    }

    public replace(previous: string, next: Type) {
        this.replaceMap.set(previous, next);
    }
}

function instantiateType(context: MutContext, state: InstantiateState, struct: DeclStruct, args: ReadonlyArray<Type>): RefGlobalDecl {
    const id = context.root.add((id) => {
        const children = MutContext.createAndSet(context, id, {
            nodes: struct.children.nodes.slice(),
            decls: struct.children.decls.slice(),
        });

        const s = new DeclStruct(`${struct.name}_${id}`, [], children.finalize([]), new GenericData([], args));

        const parameters = struct.generics!.parameters;
        for (let index = 0; index < parameters.length; index++) {
            state.replace(`${id}.${parameters[index]}`, args[index]);
        }

        return instantiate(context, s, id, state);
    });

    return Ref.localToGlobal(context.root, id);
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

    const id = context.add((id) => {
        // TODO: Copy body, decls, names rather than referencing
        const children = MutContext.createAndSet(context, id, {
            nodes: nodes,
            body:  fn.children.body as any,
            decls: fn.children.decls as any,
            names: fn.children.names as any,
        });

        return Node.mutate(fn, {
            name: `${fn.name}_${context.module.children.decls.length}`,
            children: children.finalize(fn.children.body),
            flags: Flags.unset(fn.flags, DeclFunctionFlags.Abstract),
        });
    });

    return new RefGlobal(context.root.declare(id));
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
