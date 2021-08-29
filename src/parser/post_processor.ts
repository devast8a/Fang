/**
 * Current as of 2020-12-31 - devast8a
 *
 * The 'tag' function returns a nearley post-processor that tags matched input with the given PTag.
 * The Parser class can be used to register an AST Builder to a given PTag.
 *
 * If you want to:
 *  - Add your own syntax:
 *      - Add your rules to grammar/grammar.ne
 *      - Create your tag below
 *      - Link your rule to the tag with "{%p.<TAGNAME>%}"
 *      - Link an AST builder to that tag in ast_builders.ts
 */
////////////////////////////////////////////////////////////////////////////////////////////////////
export enum PTag {
    DeclClass,
    DeclFunction,
    DeclParameter,
    DeclTrait,
    DeclVariable,
    ExprBinary,
    ExprCall,
    ExprConstruct,
    ExprIdentifier,
    ExprMacroCall,
    ExprUnaryPostfix,
    ExprUnaryPrefix,
    LiteralIntegerBin,
    LiteralIntegerDec,
    LiteralIntegerHex,
    LiteralIntegerOct,
    LiteralString,
    StmtAssign,
    StmtForEach,
    StmtIf,
    StmtMatch,
    StmtReturn,
    StmtWhile,
}

export type PNode =
    & PNode[]
    & {value: string}
    & List<PNode, PNode>
    & {tag: PTag, data: PNode}
    ;

////////////////////////////////////////////////////////////////////////////////////////////////////
function tag(tag: PTag) {
    return function(data: any[]) {
        return {
            tag: tag,
            name: PTag[tag],
            data: data,
        };
    };
}

export const DeclClass          = tag(PTag.DeclClass);
export const DeclFunction       = tag(PTag.DeclFunction);
export const DeclParameter      = tag(PTag.DeclParameter);
export const DeclTrait          = tag(PTag.DeclTrait);
export const DeclVariable       = tag(PTag.DeclVariable);
export const ExprBinary         = tag(PTag.ExprBinary);
export const ExprCall           = tag(PTag.ExprCall);
export const ExprConstruct      = tag(PTag.ExprConstruct);
export const ExprIdentifier     = tag(PTag.ExprIdentifier);
export const ExprMacroCall      = tag(PTag.ExprMacroCall);
export const ExprUnaryPostfix   = tag(PTag.ExprUnaryPostfix);
export const ExprUnaryPrefix    = tag(PTag.ExprUnaryPrefix);
export const LiteralIntegerBin  = tag(PTag.LiteralIntegerBin);
export const LiteralIntegerDec  = tag(PTag.LiteralIntegerDec);
export const LiteralIntegerHex  = tag(PTag.LiteralIntegerHex);
export const LiteralIntegerOct  = tag(PTag.LiteralIntegerOct);
export const LiteralString      = tag(PTag.LiteralString);
export const StmtAssign         = tag(PTag.StmtAssign);
export const StmtForEach        = tag(PTag.StmtForEach);
export const StmtIf             = tag(PTag.StmtIf);
export const StmtMatch          = tag(PTag.StmtMatch);
export const StmtReturn         = tag(PTag.StmtReturn);
export const StmtWhile          = tag(PTag.StmtWhile);

// Post-processors /////////////////////////////////////////////////////////////////////////////////
export function RejectOperators(node: any, location: any, reject: any) {
    switch (node[0].value) {
        case '!':
        case '.':
        case ':':
        case '->':
        case '=>':
        case '#':
        case '=':
            return reject;

        default:
            return node;
    }
}

// Converts the matched AST of a STAR or PLUS macro call into a List
interface List<Element, Separator> {
    begin: PNode;
    begin_ws: PNode;
    elements: Element[];
    separators: Separator[];
    all: (Element | Separator)[];
    end_ws: PNode | null;
    end: PNode;
}

export function ListProcessor(node: any[]): List<PNode, PNode> {
    if (node[2] === null) {
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
        elements:   all.filter((_, i) => i % 2 === 0),
        separators: all.filter((_, i) => i % 2 === 1),
        all:        all,
        end_ws:     node[2][2],
        end:        node[3],
    };

    return result
}

// Similar to list processor but has no begin and end
export function MainProcessor(node: any[]) {
    if (node[1] === null) {
        return node;
    }

    return [node[1][0]].concat(...node[1][1]);
}