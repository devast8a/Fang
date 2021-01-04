import { Enum } from '../common/enum';
import { PTag } from './post_processor';

export type Builder<T> = (node: any[], parser: Parser<T>) => T;

// TODO: Consider consistent naming with Node, AST Thing, etc...
type ParseTree = {tag: PTag, data: ParseTree[]} | null;

export class Parser<T> {
    public readonly builders: ReadonlyArray<Builder<T>>;
    public readonly name: string;

    constructor(name: string) {
        this.name = name;

        const count = Enum.getCount(PTag);

        this.builders = new Array(count);

        for (let i = 0; i < count; i++) {
            (this.builders as any)[i] = () => {throw new Error(`Parser ${this.name} does not define a builder for ${PTag[i as any]}`)}
        }
    }

    public parse(node: ParseTree): (T | null) {
        if (node === undefined || node === null) {
            return null;
        }

        const tag = node.tag;

        if (tag === undefined) {
            throw new Error(`Parsing node without a tag`);
        }

        const fn = this.builders[tag];

        return fn(node.data, this);
    }

    public register(tag: PTag, builder: Builder<T>) {
        (this.builders as any)[tag] = builder;
    }
}