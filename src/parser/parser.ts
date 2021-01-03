import { Enum } from '../common/enum';
import { PTag } from './post_processor';

export type Builder<T> = (node: any[], parser: Parser<T>) => T;

// TODO: Consider consistent naming with Node, AST Thing, etc...
type ParseTree = {tag: PTag, data: ParseTree[]} | null;

export class Parser<T> {
    private readonly builders: Array<Builder<T>>;
    public readonly name: string;

    constructor(name: string){
        this.name = name;

        this.builders = new Array<Builder<T>>(Enum.getCount(PTag)).
            map((tag) => () => {
                throw new Error(`Parser ${this.name} does not define a builder for ${PTag[tag as any]}`)
            });
    }

    public parse(node: ParseTree): (T | null){
        if(node === undefined || node === null){
            return null;
        }

        const tag = node.tag;
        const fn = this.builders[tag];

        return fn(node.data, this);
    }

    public register(tag: PTag, builder: Builder<T>){
        this.builders[tag] = builder;
    }
}