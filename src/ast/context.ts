import { Scope, Node, Tag } from './nodes';
import * as Nodes from './nodes';
import { MultiMapUtils } from '../utils';

export enum State {
    NOT_STARTED,
    RUNNING,
    DONE,
}

export class Context {
    public constructor(
        public readonly parent: Context | null,
        public readonly scope: Scope,
        public readonly nodes: Node[],
    ) { }

    public add(definition: Node | ((context: Context) => Node)) {
        const id = this.nodes.length;

        // Add the node
        if (typeof (definition) === 'function') {
            const container = new Scope(
                this.scope,
                new Map(),
            );

            const context = new Context(
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

        return new Nodes.RefId(id);
    }
}