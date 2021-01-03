import { Enum } from '../common/enum';
import { PTag } from './post_processor';

export type Builder<T> = (node: any[], parser: Parser<T>) => T;

// TODO: Consider consistent naming with Node, AST Thing, etc...
type ParseTree = {tag: PTag, data: ParseTree[]} | null;

export class Parser<T> {
    private registration = new Array<Builder<T>>(Enum.getCount(PTag));
    public readonly name: string;

    constructor(name: string){
        this.name = name;
    }

    public parse(node: ParseTree): (T | null) {
        if(node === undefined || node === null){
            return null;
        }

        const tag = node.tag;
        const fn = this.registration[tag];

        // TODO: Throw an error when trying to parse an unknown node
        if(fn === undefined){
            throw new Error(`Parser ${this.name} does not have a registered builder for node ${PTag[node.tag]}`);
        }

        return fn(node.data, this);
    }

    public register(tag: PTag, builder: Builder<T>){
        this.registration[tag] = builder;
    }
}