import { Ref, RefId, Scope, Tag } from '../ast/nodes';
import * as Nodes from '../ast/nodes';
import { Ctx } from '../ast/context';
import { MultiMapUtils } from '../utils';
import { mutateRef } from '../ast/mutate';

// TODO: Implement poisoning properly
export function resolveNames(ctx: Ctx, refs: RefId[]) {
    const nodes = ctx.nodes;

    for (let id = 0; id < nodes.length; id++) {
        const node = nodes[id];

        const set = (ref: Ref): Ref => {
            switch (ref.tag) {
                case Tag.RefName: {
                    const ids = lookup((node as any).parent, ref.target);

                    if (ids === null) {
                        return ref;
                    }
                    if (ids.length === 1) {
                        return new Nodes.RefId(ids[0]);
                    }
                    return new Nodes.RefIds(ids);
                }
                    
                // case Tag.RefFieldName: {
                //     const object = set(ref.object);
                //     const type = getType(ctx, object);

                //     console.log(type, object);
                //     return mutate(ref, 'object', set);
                // }
                    
                default: return ref;
            }
        }

        nodes[id] = mutateRef(node, set);
    }
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