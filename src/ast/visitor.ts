import { Constructor } from '../common/constructor';
import { Enum } from '../common/enum';

export class Visitor<
    Node extends {tag: number},
    Parameters extends Array<any>,
    Result,
> {
    protected readonly visitors: readonly Handler<this, Node, Parameters, Result>[];

    protected constructor(
        tag: Enum,
        setup: Setup<any, Node, Parameters, Result>
    ) {
        this.visitors = new Array(Enum.getCount(tag)).fill((node: Node) => {
            throw new Error(`${this.constructor.name} does not define a visitor for ${tag[node.tag]}`);
        });

        setup((constructor, handler) => {
            (this.visitors as any)[constructor.tag] = handler as any;
        });
    }

    protected visit(node: Node, ...parameters: Parameters) {
        return this.visitors[node.tag](node, this, ...parameters);
    }
}

export type Handler<Visitor, Node, Parameters extends Array<any>, Result> =
    (node: Node, visitor: Visitor, ...parameters: Parameters) => Result;

export type Setup<Visitor, Node, Parameters extends Array<any>, Result> =
    (reg: Register<Visitor, Node, Parameters, Result>) => void;

export type Register<Visitor, Node, Parameters extends Array<any>, Result> =
    <N extends Node>(
        constructor: Constructor<N> & {tag: number},
        handler: Handler<Visitor, N, Parameters, Result>
    ) => void;