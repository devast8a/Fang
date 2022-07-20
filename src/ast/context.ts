import { Scope, Node, Tag, RefId, Ref } from './nodes';
import { MultiMapUtils, unimplemented } from '../utils';
import { Builtins, populateBuiltins } from '../builtins';

export class Ctx {
    public readonly builtins: Builtins;

    private constructor(
        public readonly parent: Ctx | null,
        public readonly scope: Scope,
        public readonly nodes: Node[],
    ) {
        this.builtins = parent === null ? populateBuiltins(this) : parent.builtins;
    }

    public static createRoot() {
        return new Ctx(
            null,
            new Scope(null, new Map()),
            [],
        )
    }

    public add(definition: Node | ((context: Ctx) => Node)) {
        const id = this.nodes.length;

        // Add the node
        if (typeof (definition) === 'function') {
            const container = new Scope(
                this.scope,
                new Map(),
            );

            const context = new Ctx(
                this,
                container,
                this.nodes,
            );

            // Reserve the id in case definition adds additional nodes
            this.nodes.push(null as any);
            definition = definition(context);
            this.nodes[id] = definition;
        } else {
            this.nodes.push(definition);
        }

        // Register the node name
        switch (definition.tag) {
            case Tag.Enum:
            case Tag.Function:
            case Tag.Struct:
            case Tag.Trait:
            case Tag.Variable:
                MultiMapUtils.push(this.scope.symbols, definition.name, id);
                break;
        }

        return new RefId(id);
    }

    public get<T extends Node>(ref: Ref<T>): T {
        if (ref.tag !== Tag.RefId) {
            throw unimplemented(ref as never);
        }

        return this.nodes[ref.target] as T;
    }
}