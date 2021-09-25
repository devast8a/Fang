// Equivalent to the context.resolve2
export class Ref {
    public constructor(
        public declaration: number,
        public member: number,
    ) {}
}

export class Scope {
    private map = new Map<string, Ref>();
    private parent: Scope | null;

    public constructor(parent: Scope | null = null) {
        this.parent = parent;
    }

    public declare(name: string, parent: number, id: number) {
        this.map.set(name, new Ref(parent, id));
    }

    public lookup(name: string): Ref | null {
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