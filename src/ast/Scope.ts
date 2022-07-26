import { RefGlobal, RefId, RefUpvalue } from './nodes';

export class Scope {
    public constructor(
        private readonly parent: Scope | null,
        private readonly declared: Map<string, number[]>,
        private readonly cache: Map<string, number[]>,
        public readonly global: boolean
    ) { }

    public push(global = false) {
        return new Scope(this, new Map(), new Map(), global);
    }

    public declare(symbol: string, id: number) {
        const ids = this.declared.get(symbol);

        if (ids === undefined) {
            const ids = [id];
            this.declared.set(symbol, ids);
            // There might already be an entry for cache set. Overwrite it.
            this.cache.set(symbol, ids);
        } else {
            ids.push(id);
        }
    }

    public lookup(symbol: string) {
        let start: Scope = this;
        let current: Scope | null = this;
        let distance = 0;

        do {
            const ids = current.declared.get(symbol);

            // Symbol does not exist in current scope, look in parent
            if (ids === undefined) {
                current = current.parent;
                distance++;
                continue;
            }

            // Resolved the symbol, cache it
            while (start !== current) {
                start.cache.set(symbol, ids);

                // We will hit current before we hit null
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                start = start.parent!;
            }

            const id = ids[ids.length - 1];

            // TODO: Remove `current !== this` - Blocked on the following
            //  Declaring and assigning a variable at the same time produces a Set node that directly references the
            //    variable with RefId. This causes breakage in top-level code that refers to nodes with RefGlobal
            if (current.global && current !== this) {
                return new RefGlobal(id);
            } else if (distance === 0) {
                return new RefId(id);
            } else {
                return new RefUpvalue(id, distance);
            }
        } while (current !== null);

        // Symbol does not exist at all.
        return null;
    }
}
