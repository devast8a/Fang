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
    BlockAttribute,
    Break,
    Continue,
    PDeclEnum,
    PDeclFunction,
    PDeclParameter,
    PDeclStruct,
    PDeclTrait,
    PDeclVariable,
    PExprBinary,
    PExprCall,
    PExprConstruct,
    PExprForEach,
    PExprGenericApply,
    PExprIdentifier,
    PExprIf,
    PExprIndexBracket,
    PExprIndexDot,
    PExprMacroCall,
    PExprMove,
    PExprMatch,
    PExprNamedArgument,
    PExprReturn,
    PExprSet,
    PExprUnaryPostfix,
    PExprUnaryPrefix,
    PExprWhile,
    PLiteralIntegerBin,
    PLiteralIntegerDec,
    PLiteralIntegerHex,
    PLiteralIntegerOct,
    PLiteralList,
    PLiteralString,
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

export const BlockAttribute      = tag(PTag.BlockAttribute);
export const Break               = tag(PTag.Break);
export const Continue            = tag(PTag.Continue);
export const PDeclEnum           = tag(PTag.PDeclEnum);
export const PDeclFunction       = tag(PTag.PDeclFunction);
export const PDeclParameter      = tag(PTag.PDeclParameter);
export const PDeclStruct         = tag(PTag.PDeclStruct);
export const PDeclTrait          = tag(PTag.PDeclTrait);
export const PDeclVariable       = tag(PTag.PDeclVariable);
export const PExprBinary         = tag(PTag.PExprBinary);
export const PExprCall           = tag(PTag.PExprCall);
export const PExprConstruct      = tag(PTag.PExprConstruct);
export const PExprForEach        = tag(PTag.PExprForEach);
export const PExprGenericApply   = tag(PTag.PExprGenericApply);
export const PExprIdentifier     = tag(PTag.PExprIdentifier);
export const PExprIf             = tag(PTag.PExprIf);
export const PExprIndexBracket   = tag(PTag.PExprIndexBracket);
export const PExprIndexDot       = tag(PTag.PExprIndexDot);
export const PExprMacroCall      = tag(PTag.PExprMacroCall);
export const PExprMove           = tag(PTag.PExprMove);
export const PExprMatch          = tag(PTag.PExprMatch);
export const PExprNamedArgument  = tag(PTag.PExprNamedArgument);
export const PExprReturn         = tag(PTag.PExprReturn);
export const PExprSet            = tag(PTag.PExprSet);
export const PExprUnaryPostfix   = tag(PTag.PExprUnaryPostfix);
export const PExprUnaryPrefix    = tag(PTag.PExprUnaryPrefix);
export const PExprWhile          = tag(PTag.PExprWhile);
export const PLiteralIntegerBin  = tag(PTag.PLiteralIntegerBin);
export const PLiteralIntegerDec  = tag(PTag.PLiteralIntegerDec);
export const PLiteralIntegerHex  = tag(PTag.PLiteralIntegerHex);
export const PLiteralIntegerOct  = tag(PTag.PLiteralIntegerOct);
export const PLiteralList        = tag(PTag.PLiteralList);
export const PLiteralString      = tag(PTag.PLiteralString);

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