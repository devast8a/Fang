import { Visitor } from '../ast/visitor';
import { Flags } from '../common/flags';
import { FunctionFlags, Tag, Type } from '../nodes';

export const markAbstractFunctions = new Visitor({
    after: (node, context) => {
        switch (node.tag) {
            case Tag.DeclFunction: {
                if (node.parameters.some(parameter => Type.resolve(context, parameter.type).tag === Tag.DeclTrait)) {
                    node.flags = Flags.set(node.flags, FunctionFlags.Abstract);
                }
            }
        }

        return node;
    }
});