import { VisitChildren } from '../ast/VisitChildren';
import { createVisitor } from '../ast/visitor';
import { VisitRefDecl } from '../ast/VisitRefDecl';
import { VisitType } from '../ast/VisitType';
import { CantFindFieldError, CantFindSymbolError, SelfWithoutParentError, ValueOrTypeError } from '../errors';
import { Context, Decl, Expr, Node, RefFieldId, RefGlobal, RefGlobalDecl, RefLocal, RootId, Tag, TypeGet, unreachable } from '../nodes';

// TODO: Implement poisoning properly
export const resolveNames = createVisitor(VisitChildren, VisitType, VisitRefDecl, (context, node, id, state, {first}) => {
    switch (node.tag) {
        case Tag.RefName: {
            const ref = lookup(context, node.name);

            if (ref === null) {
                console.log(node.name);
                context.error(new CantFindSymbolError());
                return node;
            }

            return ref;
        }
            
        case Tag.RefFieldName: {
            // TODO: Clean up this mess
            const target = first(context, context.get(node.target), node.target, state);
            const typeRef = (Expr.getReturnType(context, target) as TypeGet).target;
            const type = context.get(typeRef) as Decl;
            const children = Node.getChildren(type)!;
            const id = children.names.get(node.field);

            if (id === undefined) {
                context.error(new CantFindFieldError(context, node));
                return node;
            }

            let typeRefId = 0;

            switch (typeRef.tag) {
                case Tag.RefGlobal:
                    typeRefId = typeRef.id;
                    break;

                case Tag.RefGlobalDecl:
                    if (typeRef.id === -1) {
                        typeRefId = typeRef.member;
                    } else {
                        typeRefId = typeRef.id;
                    }

                    break;
                
                default:
                    throw unreachable(typeRef);
            }

            return new RefFieldId(node.target, typeRefId, id[0]);
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

            // The variable name 'self' is defined by the language to have the type of the enclosing Struct or Trait
            if (node.name === 'self') {
                const parent = context.container.parent;

                if (parent === null) {
                    // The variable is not inside a Struct or Trait.
                    context.error(new SelfWithoutParentError(context, id));
                    return node;
                } else {
                    // The variable is inside of a container (assume it is a Struct or Trait for now).
                    return Node.mutate(node, { type: new TypeGet(parent) });
                }
            }

            // ERROR. None of the above rules match. We don't know what the variable type is.
            context.error(new ValueOrTypeError(context, id));
            console.log(context.get(id));
            return node;
        }
    }

    return node;
});

function lookup(context: Context, name: string) {
    // TODO: Support caching
    // TODO: Support names that bind to multiple symbols
    let current: Context | null = context;

    while (current !== null) {
        const names = current.container.names;
        const ids = names.get(name);

        if (ids !== undefined) {
            // TODO: Simplify generation of references
            if (current === context) {
                return new RefLocal(ids[0]);
            } else {
                return new RefGlobalDecl(current.container.self.id, ids[0]);
            }
        }

        current = current.getParent();
    }

    return null;
}