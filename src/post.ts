// Setup code from ast_builders in a suitable way for nearley to use.
import * as AstBuilder from "./ast_builders";
import { Compiler } from './compile';
import { Scope } from './ast';

type Node = any;

export enum Tag {
    NODE,
    WHITESPACE,
    TYPE,
    LIST,
    PARAMETER_NAME_TYPE,
    PARAMETER_TYPE,
}

function builder<T>(builder: (node: Node, state: Compiler, scope: Scope) => T){
    return function(node: Node){
        return {
            tag: Tag.NODE,
            data: node,
            builder: builder,
            name: builder.name,
        };
    }
}

// The grammar uses the same rules for both Class/Trait
// Dispatch to the correct builder based on the keyword used
// See: declare_trait in the grammar
export function Trait(node: any){
    return {
        tag: Tag.NODE,
        data: node,
        builder: (node[0][0].value === "trait" ? AstBuilder.Trait : AstBuilder.Class)
    }
}

//export const Class          = builder(AstBuilder.Class);
export const Function       = builder(AstBuilder.Function);
//export const Trait          = builder(AstBuilder.Trait);
export const Variable       = builder(AstBuilder.Variable);
export const ExCall         = builder(AstBuilder.ExCall);
export const ExConstruct    = builder(AstBuilder.ExConstruct);
export const ExOpInfix      = builder(AstBuilder.ExOpInfix);
export const ExOpPostfix    = builder(AstBuilder.ExOpPostfix);
export const ExOpPrefix     = builder(AstBuilder.ExOpPrefix);
export const ExReturn       = builder(AstBuilder.ExReturn);
export const ExVariable     = builder(AstBuilder.ExVariable);
export const ExprIndexDot   = builder(AstBuilder.ExprIndexDot);
export const LiteralInteger = builder(AstBuilder.LiteralInteger);
export const LiteralString  = builder(AstBuilder.LiteralString);
export const StmtAssign     = builder(AstBuilder.StmtAssign);

export function whitespace(node: Node){
    return {
        tag: Tag.WHITESPACE,
        data: node,
    };
}

export function type(node: Node){
    return {
        tag: Tag.TYPE,
        data: node,
    };
}

export function parameterNameType(node: Node){
    return {
        tag: Tag.PARAMETER_NAME_TYPE,
        data: node,
    }
}

export function parameterType(node: Node){
    return {
        tag: Tag.PARAMETER_TYPE,
        data: node,
    }
}

function select(obj: any, ...keys: any[]){
    for (const key of keys) {
        obj = obj[key];

        if (obj === undefined || obj === null) {
            break;
        }
    }
    return obj;
};

interface List<Element, Separator> {
    tag: Tag.LIST;
    begin: Node;
    begin_ws: Node;
    elements: Element[];
    separators: Separator[];
    all: (Element | Separator)[];
    end_ws: Node;
    end: Node;
}

// Converts the matched AST of a STAR macro call into a List
export function STAR(node: Node): List<Node, Node>{
    node = node[0];

    var all = [];
    if (node[2] !== null) {
        all.push(select(node, 2, 0));
        all = all.concat(...select(node, 2, 1));
    }

    return {
        tag: Tag.LIST,
        begin: select(node, 0),
        begin_ws: select(node, 1),
        elements: all.filter((_, i) => i % 2 == 0),
        separators: all.filter((_, i) => i % 2 == 1),
        all: all,
        end_ws: select(node, 2, 2),
        end: select(node, 3),
    }
}

// Converts the matched AST of a PLUS macro call into a List
export function PLUS(node: Node): List<Node, Node>{
    node = node[0];

    const all = [node[2]].concat(...node[3]);

    return {
        tag: Tag.LIST,
        begin: select(node, 0),
        begin_ws: select(node, 1),
        elements: all.filter((_, i) => i % 2 == 0),
        separators: all.filter((_, i) => i % 2 == 1),
        all: all,
        end_ws: select(node, 4),
        end: select(node, 5),
    };
}