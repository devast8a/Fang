import { Enum } from '../common/enum';
import {Tag, Node} from './ast_builders';

export type Builder = (parser: Parser, node: any[]) => Node;

// TODO: Consider consistent naming with Node, AST Thing, etc...
type ParseTree = {tag: Tag, data: ParseTree[]} | null;

export class Parser {
    private registration = new Array<Builder>(Enum.getCount(Tag));

    public parse(node: ParseTree): (Node | null) {
        if(node === undefined || node === null){
            return null;
        }

        const tag = node.tag;
        const fn = this.registration[0];

        // TODO: Throw an error when trying to parse an unknown node
        if(fn === undefined){
            throw new Error(`Trying to parse unknown node ${Tag[node.tag]}`);
        }

        return fn(this, node.data);
    }

    public registerBuilderToTag(tag: Tag, builder: Builder){
        this.registration[tag] = builder;
    }
}

export function register(tag: Tag){
    return function(data: any[]){
        return {
            tagName: Tag[tag],
            tag: tag,
            data: data,
        };
    };
}