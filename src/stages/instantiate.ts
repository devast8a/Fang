import { Node, Tag } from '../nodes';

export function instantiate(node: Node) {
    switch (node.tag) {
        case Tag.Class: break;
        case Tag.Function: break;
        case Tag.Trait: break;
        case Tag.FunctionSignature: break;
        case Tag.Generic: break;
        case Tag.GenericApply: break;
        case Tag.GenericParameter: break;
        case Tag.TypeRefName: break;
        case Tag.TypeInfer: break;
    }

    throw new Error('Unreachable');
}