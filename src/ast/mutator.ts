import { Thing, Tag, TagCount } from '../ast';

type Constructor<T = any, P = any> = { new(...args: any[]): T, prototype: P };

export type MutatorHandler<Thing, Mutator> = (input: Thing, visitor: Mutator) => Thing;

export class Mutator<T extends Mutator<T>> {
    public readonly mutators: readonly MutatorHandler<Thing, T>[];

    public constructor(){
        this.mutators = (this.constructor as any).mutators;
    }

    protected default_mutator(thing: Thing, mutator: T){
        throw new Error(`${mutator.constructor.name} does not specify a mutator for ${Tag[thing.tag]}`);
    }

    protected mutate<T>(input: T): T {
        return (this.mutators[(input as any).tag] as any)(input, this);
    }
}

export function mutator<
    ThingT,
    MutatorT extends Mutator<MutatorT>
>(
    thing: Constructor<ThingT> & {tag: Tag},
    mutator: Constructor<MutatorT>,
    handler: MutatorHandler<ThingT, MutatorT>
)
{
    // Attaches an array to the Mutator's constructor
    const constructor = mutator as any;
    if(constructor.mutators === undefined){
        constructor.mutator_default = (thing: Thing) => {
            throw new Error(`${mutator.name} does not specify a mutator for ${Tag[thing.tag]}`);
        };

        constructor.mutators = new Array(TagCount).fill(constructor.prototype.default_mutator);
    }
    constructor.mutators[thing.tag] = handler;
}