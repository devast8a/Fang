import { Node, Ref, RefId, Scope, Tag } from '../ast/nodes';
import * as Nodes from '../ast/nodes';
import { Context } from '../ast/context';
import { MultiMapUtils, unimplemented, unreachable } from '../utils';

// TODO: Implement poisoning properly
export function resolveNames(context: Context, refs: RefId[]) {
    const nodes = context.nodes;

    for (let id = 0; id < nodes.length; id++) {
        const node = nodes[id];

        nodes[id] = mutateRef(node, ref => {
            if (ref.tag === Tag.RefName) {
                const ids = lookup((node as any).parent, ref.target);

                if (ids === null) {
                    return ref;
                } else if (ids.length === 1) {
                    return new Nodes.RefId(ids[0]);
                } else {
                    return new Nodes.RefIds(ids);
                }
            }

            return ref;
        });
    }
}

function mutateRef(node: Node, fn: (ref: Ref) => Ref) {
    switch (node.tag) {
        case Tag.Function:      return mutate(node, 'returnType', fn);
        case Tag.Struct:        return node;
        case Tag.Trait: return node;
        case Tag.Variable: return node;
        case Tag.Break: return mutateNull(node, 'value', fn);
        case Tag.Call: return mutate(node, 'target', fn);
        case Tag.Constant: return mutate(node, 'type', fn);
        case Tag.Continue: return mutateNull(node, 'value', fn);
        case Tag.Get: return mutate(node, 'target', fn);
        case Tag.If: throw unimplemented(node as never);
        case Tag.Move: throw unimplemented(node as never);

        default:
            throw unreachable(node as never);
    }
}

function mutate<T, F extends keyof T>(node: T, field: F, fn: (field: T[F]) => T[F]) {
    const value = node[field];
    const mutated = fn(value);

    if (value === mutated) {
        return node;
    } else {
        return Object.assign({}, node, {[field]: mutated});
    }
}

function mutateNull<T, F extends keyof T>(node: T, field: F, fn: (field: NonNullable<T[F]>) => T[F]) {
    if (node[field] === null) {
        return node;
    }

    return mutate(node, field, fn as any);
}

function lookup(scope: Scope, symbol: string) {
    let current: Scope | null = scope;

    do {
        const ids = current.symbols.get(symbol);

        // Symbol does not exist in current scope, look in parent
        if (ids === undefined) {
            current = current.parent;
            continue;
        }

        // Resolved the symbol, cache it in the starting scope.
        while (scope !== current) {
            MultiMapUtils.pushMulti(scope.symbols, symbol, ids);

            // We will hit current before we hit null
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            scope = scope.parent!;
        }

        return ids;
    } while (current !== null)

    // Symbol does not exist at all.
    return null;
}
