// =========================================================================
export type NearleySymbol =
    | string                             // Name of rule to match
    | { literal: string }                // Match value of token
    | { type: string }                   // Match name of token
    | { test: (token: any) => boolean }  // Arbitrary matcher
    ;

export type NearleyProcessor = (data: any[], location: any, reject: any) => any;

export interface NearleyRule {
    name: string
    symbols: NearleySymbol[]
    postprocess?: NearleyProcessor
}

export interface NearleyGrammar {
    Lexer: any;
    ParserRules: NearleyRule[];
    ParserStart: string;
}

// =========================================================================
export type MooRule =
    | RegExp
    | string
    ;