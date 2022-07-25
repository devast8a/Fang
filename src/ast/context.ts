import { Node, Tag, RefId, Ref } from './nodes';
import { unimplemented } from '../utils';
import { Builtins, populateBuiltins } from '../builtins';

export class Ctx {
    public readonly builtins: Builtins;
    public root: RefId[] = [];

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

        return new RefId<T>(id);
    }

    public get<T extends Node>(ref: Ref<T>): T {
        if (ref.tag !== Tag.RefId) {
            throw unimplemented(ref as never);
        }

        return this.nodes[ref.target] as T;
    }
}