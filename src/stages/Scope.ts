import { Node } from '../nodes';

export class Scope {
    private map = new Map<string, Node>();
    private parent: Scope | null;

    public constructor(parent: Scope | null = null) {
        this.parent = parent;
    }

    public declare(name: string, node: Node) {
        this.map.set(name, node);
    }

    public lookup(name: string): Node | null {
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
