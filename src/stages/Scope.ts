import { Node, SymbolSet, UnresolvedId } from '../nodes';

export class Scope {
    private map = new Map<string, SymbolSet>();
    private parent: Scope | null;

    public constructor(parent: Scope | null = null) {
        this.parent = parent;
    }

    public declare(name: string, node: Node) {
        let set = this.map.get(name);

        if (set === undefined) {
            set = new SymbolSet(UnresolvedId);
            this.map.set(name, set);
        }

        set.nodes.push(node);
    }

    public lookup(name: string): SymbolSet | null {
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
