import { Tag } from './ast_builders';
import { register } from './parser';

/**
 * Current as of 2020-12-31 - devast8a
 * 
 * The 'register' function returns a nearley post-processor that ties matched input for a particular
 * grammar rule to a Tag. The Parser class is then used to run an AST builder that is tied to the
 * same tag.
 * 
 * If you want to:
 *  - Add your own syntax:
 *      - Add your rules to grammar/grammar.ne
 *      - Create a new Tag
 *      - Register that Tag below
 *      - Link an AST builder to that tag in ast_builders.ts
 */

// AST Node Builders ///////////////////////////////////////////////////////////////////////////////
export const DeclClass          = register(Tag.DeclClass);
export const DeclFunction       = register(Tag.DeclFunction);
export const DeclVariable       = register(Tag.DeclVariable);
export const ExprBinary         = register(Tag.ExprBinary);
export const ExprCall           = register(Tag.ExprCall);
export const ExprUnary          = register(Tag.ExprUnary);

// Post-processors /////////////////////////////////////////////////////////////////////////////////
export function RejectOperators(node: any, location: any, reject: any){
    switch(node[0].value){
        case '!':
        case '.':
        case '#':
        case '=':
            return reject;

        default:
            return node;
    }
}

// Converts the matched AST of a STAR or PLUS macro call into a List
interface List<Element, Separator> {
    begin: Node;
    begin_ws: Node;
    elements: Element[];
    separators: Separator[];
    all: (Element | Separator)[];
    end_ws: Node | null;
    end: Node;
}

export function ListProcessor(node: any[]): List<Node, Node>{
    if(node[2] === null){
        return {
            begin: node[0],
            begin_ws: node[1],
            elements: [],
            separators: [],
            all: [],
            end_ws: null,
            end: node[3],
        };
    }

    const all = [node[2][0]].concat(...node[2][1]);

    const result = {
        begin:      node[0],
        begin_ws:   node[1],
        elements:   all.filter((_, i) => i % 2 == 0),
        separators: all.filter((_, i) => i % 2 == 1),
        all:        all,
        end_ws:     node[2][2],
        end:        node[3],
    };

    return result
}

// Similar to list processor but has no begin and end
export function MainProcessor(node: any[]){
    if(node[1] === null){
        return node;
    }

    return [node[1][0]].concat(...node[1][1]);
}