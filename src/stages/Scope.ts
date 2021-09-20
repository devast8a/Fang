import { Decl, DeclSymbol, UnresolvedId } from '../nodes';

export class Scope {
    private map = new Map<string, DeclSymbol>();
    private parent: Scope | null;

    public constructor(parent: Scope | null = null) {
        this.parent = parent;
    }

    public declare(name: string, decl: Decl) {
        let set = this.map.get(name);

        if (set === undefined) {
            set = new DeclSymbol(UnresolvedId);
            this.map.set(name, set);
        }

        set.nodes.push(decl.id);
    }

    public lookup(name: string): DeclSymbol | null {
        const symbol = this.map.get(name);

        if (symbol !== undefined) {
            return symbol;
        }

        if (this.parent !== null) {
            return this.parent.lookup(name);
        }

        return null;
    }

    public newChildScope(): Scope {
        return new Scope(this);
    }
}
