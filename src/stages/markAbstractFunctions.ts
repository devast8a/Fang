import { Visitor } from '../ast/visitor';
import { Flags } from '../common/flags';
import { FunctionFlags, Tag } from '../nodes';

export const markAbstractFunctions = new Visitor({
    after: (node) => {
        switch (node.tag) {
            case Tag.Function: {
                if (node.parameters.some(parameter => parameter.type.tag === Tag.Trait)) {
                    node.flags = Flags.set(node.flags, FunctionFlags.Abstract);
                }
            }
        }

        return node;
    }
});