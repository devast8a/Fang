import { Node, LocalRef, Ref, Distance, RefById, Tag } from './nodes';
import { Builtins, populateBuiltins } from '../builtins';

export class Ctx {
    public readonly builtins: Builtins;
    public root: LocalRef[] = [];
    public LOGGING = 0;

    private constructor(
        public readonly nodes: Node[],
    ) {
        this.builtins = populateBuiltins(this);
    }

    public static createRoot() {
        return new Ctx([]);
    }

    public add<T extends Node>(node: T | ((ref: RefById<T>) => T)) {
        if (node === undefined) {
            return undefined as any
        }

        const id = this.nodes.length;
        const ref = new RefById<T>(null, id, Distance.Local);

        if (node instanceof Function) {
            this.nodes.push(null as any);
            node = node(ref);
            (node as any).id = id;
            this.nodes[id] = node;
        } else {
            (node as any).id = id;
            this.nodes.push(node);
        }

        return ref;
    }

    public get<T extends Node>(ref: Ref<T>): T {
        if (ref.tag !== Tag.RefById) {
            throw new Error(`ref must be RefById, got ${ref.tag}`);
        }

        return this.nodes[ref.id] as T;
    }

    public replace(id: number, node: Node) {
        this.nodes[id] = node;
        (node as any).id = id;
        return node;
    }
}