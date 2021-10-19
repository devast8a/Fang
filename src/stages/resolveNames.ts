import { VisitChildren } from '../ast/VisitChildren';
import { createVisitor } from '../ast/visitor';
import { VisitRefDecl } from '../ast/VisitRefDecl';
import { VisitType } from '../ast/VisitType';
import { Context, Expr, Node, Ref, RefFieldId, RefGlobal, RefGlobalDecl, RefLocal, RootId, Tag } from '../nodes';

export const resolveNames = createVisitor(VisitChildren, VisitType, VisitRefDecl, (context, node, id, state, {first}) => {
    switch (node.tag) {
        case Tag.RefName: {
            const ref = lookup(context, node.name);

            if (ref === undefined) {
                throw new Error(`Can not find symbol with name ${node.name}`);
            }

            return ref;
        }
            
        case Tag.RefFieldName: {
            // TODO: Properly complete a lookup
            const targetTypeRef = lookup(context, "Foo")!;
            const targetType = Ref.resolve(context, targetTypeRef);
            const children = Node.getChildren(targetType);

            const id = children.names.get(node.field);

            if (id === undefined) {
                throw new Error(`Can not find field with name ${node.field}`);
            }

            console.log(targetTypeRef);

            return new RefFieldId(node.target, targetTypeRef.id, id[0]);
        }
            
        case Tag.DeclVariable: {
            if (node.type.tag !== Tag.TypeInfer) {
                return node;
            }

            if (node.value === null) {
                throw new Error("Variable must have a type or a value or both.");
            }

            const value_ = Expr.get(context, node.value);
            const value = first(context, value_, node.value, state);
            const type = Expr.getReturnType(context, value);
            return Node.mutate(node, { type });
        }
            
    }

    return node;
});

function lookup(context: Context, name: string) {
    // TODO: Support caching
    // TODO: Support names that bind to multiple symbols
    const children = context.module.children;

    let currentId = context.parent;
    while (currentId !== RootId) {
        const container = children.nodes[currentId];

        if (!Node.hasChildren(container)) {
            throw new Error(`Unreachable: Found '${Tag[(container as any).tag]}' but expected a Node with a 'children' field.`);
        }

        const names = container.children.names;
        const ids = names.get(name);

        if (ids !== undefined) {
            return currentId === context.parent ?
                new RefLocal(ids[0]) :
                new RefGlobalDecl(currentId, ids[0]);
        }

        // TODO: Find real parent id
        currentId = RootId;
    }

    // Root context
    const names = children.names;
    const ids = names.get(name);

    if (ids === undefined) {
        return undefined;
    }

    return new RefGlobal(ids[0]);
}