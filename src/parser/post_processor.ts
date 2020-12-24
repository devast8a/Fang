import { Tag } from './ast_builders';
import * as PP from './ast_builders';
import { register } from './parser';

/**
 * Nearly runs post-processors as the input is parsed.
 * The 'register' function registers an AST builder and runs it *after* the input is parsed.
 * This greatly simplifies the logic surrounding AST builders as they do not need to consider cases
 *  in which the post-processor is run, but the parse tree is ultimately discarded.
 * 
 * If you want to:
 * - Add new syntax: Write an AST Builder (see one of the ones below) and register it here.
 *      The value returned by the register functions are post-processors that can be used in
 *      grammar/grammar.ne directly.
 */

// AST Node Builders ///////////////////////////////////////////////////////////////////////////////
export const DeclClass         = register(Tag.DeclClass,    PP.DeclClassBuilder);
export const DeclFunction      = register(Tag.DeclFunction, PP.DeclFunctionBuilder);
export const DeclVariable      = register(Tag.DeclVariable, PP.DeclVariableBuilder);

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