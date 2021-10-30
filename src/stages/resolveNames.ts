import { VisitChildren } from '../ast/VisitChildren';
import { createVisitor } from '../ast/visitor';
import { VisitRefDecl } from '../ast/VisitRefDecl';
import { VisitType } from '../ast/VisitType';
import { CantFindFieldError, CantFindSymbolError, ValueOrTypeError } from '../errors';
import { Context, Decl, Expr, Node, RefFieldId, RefGlobal, RefGlobalDecl, RefLocal, RootId, Tag, TypeGet } from '../nodes';

// TODO: Implement poisoning properly
export const resolveNames = createVisitor(VisitChildren, VisitType, VisitRefDecl, (context, node, id, state, {first}) => {
    switch (node.tag) {
        case Tag.RefName: {
            const ref = lookup(context, node.name);

            if (ref === undefined) {
                console.log(node.name);
                context.error(new CantFindSymbolError());
                return node;
            }

            return ref;
        }
            
        case Tag.RefFieldName: {
            // TODO: Clean up this mess
            const target = first(context, context.get(node.target), node.target, state);
            const typeRef = (Expr.getReturnType(context, target) as TypeGet).target as RefGlobal;
            const type = context.get(typeRef) as Decl;
            const children = Node.getChildren(type)!;
            const id = children.names.get(node.field);

            if (id === undefined) {
                context.error(new CantFindFieldError(context, node));
                return node;
            }

            return new RefFieldId(node.target, typeRef.id, id[0]);
        }
            
        case Tag.DeclVariable: {
            // Variable type is explicitly declared
            if (node.type.tag !== Tag.TypeInfer) {
                return node;
            }

            // Variable has a value assigned to it, implicitly take the type of the variable
            if (node.value !== null) {
                const value_ = context.get(node.value);
                const value = first(context, value_, node.value, state);
                const type = Expr.getReturnType(context, value);
                return Node.mutate(node, { type });
            }

            // The variable name 'self' is special, give it the type of the enclosing Struct or Trait.
            if (node.name === 'self') {
                const parent = context.container.parent;
                return Node.mutate(node, { type: new TypeGet(parent) });
            }

            // ERROR. None of the above rules match. We don't know what the variable type is.
            context.error(new ValueOrTypeError(context, id));
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