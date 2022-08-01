import { Node, Tag, RefLocal, Ref } from './nodes';
import { unimplemented } from '../utils';
import { Builtins, populateBuiltins } from '../builtins';

export class Ctx {
    public readonly builtins: Builtins;
    public root: RefLocal[] = [];

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

        return new RefLocal<T>(id);
    }

    public get<T extends Node>(ref: Ref<T>): T {
        switch (ref.tag) {
            case Tag.RefField:
            case Tag.RefGlobal:
            case Tag.RefLocal:
            case Tag.RefUp:
                return this.nodes[ref.targetId] as T;

            case Tag.RefIds:     return this.nodes[ref.target[0]] as T;
            default: throw unimplemented(ref as never);
        }
    }
}