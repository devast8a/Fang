import { Thing, Tag, TagCount } from '../ast';

type Constructor<T = any, P = any> = { new(...args: any[]): T, prototype: P };

export type VisitorHandler<Thing, Visitor> = (input: Thing, visitor: Visitor) => void;

export class Visitor<T extends Visitor<T>> {
    public readonly visitors: readonly VisitorHandler<Thing, T>[];

    public constructor(){
        this.visitors = (this.constructor as any).visitors;
    }

    protected default_visitor(thing: Thing, visitor: T){
        throw new Error(`${visitor.constructor.name} does not specify a visitor for ${Tag[thing.tag]}`);
    }

    protected visit(thing: Thing){
        const queue = [thing];
        const visit = [];

        while(queue.length > 0){
            const item = queue.pop()!;
            
            item.visit(this as any, queue);
            visit.push(item);
        }

        while(visit.length > 0){
            const item = visit.pop()!;

            this.visitors[item.tag](item, this as any);
        }
    }
}

export function visitor<
    ThingT,
    VisitorT extends Visitor<VisitorT>
>(
    thing: Constructor<ThingT> & {tag: Tag},
    visitor: Constructor<VisitorT>,
    handler: VisitorHandler<ThingT, VisitorT>
){
    // Attaches an array to the Visitor's constructor
    const constructor = visitor as any;
    if(constructor.visitors === undefined){
        constructor.visitors = new Array(TagCount).fill(constructor.prototype.default_visitor);
    }

    constructor.visitors[thing.tag] = handler;
}