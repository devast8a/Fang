import { VisitDecls } from '../ast/VisitDecls';
import { createVisitor } from '../ast/visitor';
import { Flags } from '../common/flags';
import { Context, DeclFunctionFlags, DeclVariable, Node, Ref, Tag, Type } from '../nodes';

export const markAbstractFunctions = createVisitor(VisitDecls, (context, decl) => {
    if (decl.tag === Tag.DeclFunction) {
        // TODO: Create a cleaner way to query parameters
        if (decl.parameters.some(parameter => isAbstractType(context, Node.as(decl.children.nodes[parameter], DeclVariable).type))) {
            return Node.mutate(decl, {
                flags: Flags.set(decl.flags, DeclFunctionFlags.Abstract)
            });
        }
    }

    return decl;
});

export function isAbstractType(context: Context, type: Type): unknown {
    switch (type.tag) {
        case Tag.TypeGet: return Ref.resolve(context, type.target).tag === Tag.DeclTrait;
    }

    throw new Error(`'${Tag[type.tag]}' unsupported`);
}
