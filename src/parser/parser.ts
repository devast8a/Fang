import { Enum } from '../common/enum';
import { PNode, PTag } from './post_processor';

export type Builder<T> = (node: PNode, parser: Parser<T>) => T;

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

    public parse(node: PNode): T
    public parse(node: PNode | null | undefined): (T | null)
    public parse(node: PNode | null | undefined): (T | null) {
        if (node === undefined || node === null) {
            return null;
        }

        const tag = node.tag;

        if (tag === undefined) {
            console.error(node);
            throw new Error(`Parsing node without a tag`);
        }

        const fn = this.builders[tag];

        return fn(node.data, this);
    }

    public register(tag: PTag, builder: Builder<T>) {
        (this.builders as any)[tag] = builder;
    }
}