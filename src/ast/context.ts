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

    public add<T extends Node>(node: T) {
        const id = this.nodes.length;

        (node as any).id = id;
        this.nodes.push(node);

        return new RefById<T>(null, id, Distance.Local);
    }

    public get<T extends Node>(ref: Ref<T>): T {
        if (ref.tag !== Tag.RefById) {
            throw new Error('ref must be RefById');
        }

        return this.nodes[ref.id] as T;
    }
}