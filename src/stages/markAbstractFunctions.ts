import { VisitDecls } from '../ast/VisitDecls';
import { createVisitor } from '../ast/visitor';
import { Flags } from '../common/flags';
import { Context, FunctionFlags, Tag, Type } from '../nodes';

export const markAbstractFunctions = createVisitor(VisitDecls, (node, context) => {
    // TODO: Don't mutate function
    if (node.tag === Tag.DeclFunction) {
        if (node.getParameters().some(parameter => isAbstractType(context, parameter.type))) {
            node.flags = Flags.set(node.flags, FunctionFlags.Abstract);
        }
    }

    return node;
});

export function isAbstractType(context: Context, type: Type): unknown {
    switch (type.tag) {
        case Tag.TypeRefStatic: return context.resolve(type).tag === Tag.DeclTrait;
    }

    throw new Error(`'${Tag[type.tag]}' unsupported`);
}
