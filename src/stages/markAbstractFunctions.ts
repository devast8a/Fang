import { VisitChildren } from '../ast/VisitChildren';
import { VisitDecls } from '../ast/VisitDecls';
import { createVisitor } from '../ast/visitor';
import { Flags } from '../common/flags';
import { Context, DeclFunctionFlags, DeclVariable, Node, Tag, Type, TypeGet } from '../nodes';

/**
 * Mark abstract functions.
 * 
 * Marks functions as abstract (ie. sets the flag DeclFunctionFlags.Abstract).
 * A function is abstract if it
 *  - Is generic (has a `generic` keyword declaring generic parameters)
 *  - Has a parameter that is an abstract type (see `isAbstractType`)
 * 
 * The primary user of this information is the `instantiate` pass that instantiates all abstract functions.
 * It uses the abstract flag to avoid instantiating inside the bodies of abstract functions and to detect when it should
 *  instantiate the target of a function call.
 */
export const markAbstractFunctions = createVisitor(VisitDecls, VisitChildren, (context, decl) => {
    if (decl.tag === Tag.DeclFunction) {
        // TODO: Create a cleaner way to query parameters
        if (decl.parameters.some(parameter => isAbstractType(context, Node.as(decl.children.nodes[parameter], DeclVariable).type))) {
            return Node.mutate(decl, {
                flags: Flags.set(decl.flags, DeclFunctionFlags.Abstract),
            });
        }

        // TODO: Create a cleaner way to mark functions as generic
        if (decl.generics !== null && decl.generics.parameters.length > 0) {
            return Node.mutate(decl, {
                flags: Flags.set(decl.flags, DeclFunctionFlags.Abstract),
            });
        }
    }

    return decl;
});

export function isAbstractType(context: Context, type: Type): unknown {
    switch (type.tag) {
        case Tag.TypeFunction: return true;
        case Tag.TypeGet: return context.get(type.target).tag === Tag.DeclTrait;
        case Tag.TypeGenericApply: return isAbstractType(context, type.target) || type.args.some(arg => isAbstractType(context, arg));
    }

    throw new Error(`'${Tag[type.tag]}' unsupported`);
}
