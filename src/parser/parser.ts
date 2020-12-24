import {Tag, Node} from './ast_builders';

export const registration = new Map<Tag, (parser: Parser, node: any[]) => Node>();

export type ParseTree = {tag: Tag, data: ParseTree[]} | null;

export class Parser {
    public parse(node: ParseTree): (Node | null) {
        if(node === undefined || node === null){
            return null;
        }

        const tag = node.tag;
        const fn = registration.get(tag);

        // TODO: Throw an error when trying to parse an unknown node
        if(fn === undefined){
            throw new Error(`Trying to parse unknown node ${Tag[node.tag]}`);
        }

        return fn(this, node.data);
    }
}

export function register(tag: Tag, fn: (parser: Parser, node: any[]) => Node){
    registration.set(tag, fn);

    return function(data: any[]){
        return {
            tagName: Tag[tag],
            tag: tag,
            data: data,
        };
    };
}