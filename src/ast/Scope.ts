import { Distance, RefById, RefByIds } from './nodes';

class Sym {
    constructor(
        readonly ids: number[],
        readonly all: boolean,
    ) { }
}

export class Scope {
    public constructor(
        public readonly parent: Scope | null,

        public readonly symbols: Map<string, Sym>,
        public readonly cache: Map<string, Sym>,

        public readonly type: ScopeType,
    ) { }

    public push(type: ScopeType) {
        return new Scope(this, new Map(), new Map(), type);
    }

    public declare(symbol: string, id: number, all: boolean) {
        const sym = this.symbols.get(symbol);

        if (sym === undefined) {
            const sym = new Sym([id], all);
            this.symbols.set(symbol, sym);
            // There might already be an entry for cache set. Overwrite it.
            this.cache.set(symbol, sym);
        } else {
            sym.ids.push(id);
        }
    }

    public lookup(symbol: string) {
        let start: Scope = this;
        let current: Scope | null = this;
        let distance = Distance.Local as number; // Distance.Local is zero
        let sym: Sym | undefined;

        // Search for the symbol
        do {
            sym = current.symbols.get(symbol);

            if (sym !== undefined) {
                break;
            }

            if (current.type !== ScopeType.Inner) {
                distance++;
            }

            current = current.parent;
        }
        while (current !== null);

        // Could not find the symbol
        if (sym === undefined) {
            return null;
        }

        // Cache the resolved symbol
        while (start !== current) {
            start.cache.set(symbol, sym);

            // We will hit current before we hit null, disable the lint.
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            start = start.parent!;
        }

        const d = current.type === ScopeType.Global ? Distance.Global : distance;

        if (sym.all && sym.ids.length > 1) {
            return new RefByIds(null, sym.ids, d);
        } else {
            return new RefById(null, sym.ids[0], d);
        }
    }
}

export enum ScopeType {
    Inner,
    Global,
    Function,
    StructTrait,
}