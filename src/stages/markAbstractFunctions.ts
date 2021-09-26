import { createVisitor } from '../ast/visitor';
import { Flags } from '../common/flags';
import { Context, FunctionFlags, Tag, Type } from '../nodes';

export const markAbstractFunctions = createVisitor((node, context) => {
    if (node.tag !== Tag.DeclModule) {
        throw new Error('markAbstractFunction should be called on DeclModule only');
    }

    for (const fn of node.nodes) {
        if (fn.tag === Tag.DeclFunction) {
            if (fn.parameters.some(parameter => isAbstractType(context, parameter.type))) {
                // TODO: Don't mutate function
                fn.flags = Flags.set(fn.flags, FunctionFlags.Abstract);
            }
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
