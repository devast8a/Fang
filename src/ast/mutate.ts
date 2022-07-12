import { unimplemented } from '../utils';
import { Node, Ref, Tag } from './nodes';

export function mutate<T, F extends keyof T>(node: T, field: F, fn: (field: T[F]) => T[F]) {
    const value = node[field];
    const mutated = fn(value);

    if (value === mutated) {
        return node;
    } else {
        return Object.assign({}, node, {[field]: mutated});
    }
}

export function mutateNull<T, F extends keyof T>(node: T, field: F, fn: (field: NonNullable<T[F]>) => T[F]) {
    if (node[field] === null) {
        return node;
    }

    return mutate(node, field, fn as any);
}

export function mutateRef(node: Node, fn: (ref: Ref) => Ref) {
    // TODO: Constant.type should probably be resolved by default

    switch (node.tag) {
        case Tag.Enum:      return node;
        case Tag.Function:  return mutate(node, 'returnType', fn);
        case Tag.Struct:    return node;
        case Tag.Trait:     return node;
        case Tag.Variable:  return mutate(node, 'type', fn);

        case Tag.BlockAttribute: return node;
        case Tag.Break:     return mutateNull(node, 'target', fn);
        case Tag.Call:      return mutate(node, 'target', fn);
        case Tag.Constant:  return mutate(node, 'type', fn);
        case Tag.Construct: return mutate(node, 'target', fn);
        case Tag.Continue:  return mutateNull(node, 'target', fn);
        case Tag.ForEach:   return node;
        case Tag.Get:       return mutate(node, 'target', fn);
        case Tag.If:        return node;
        case Tag.Match:     return node;
        case Tag.Move:      return node;
        case Tag.Return:    return node;
        case Tag.Set:       return mutate(node, 'target', fn);
        case Tag.While:     return node;

        default:            throw unimplemented(node as never);
    }
}