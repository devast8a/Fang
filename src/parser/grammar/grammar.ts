// Generated automatically by nearley, version 2.19.1
// http://github.com/Hardmath123/nearley
// Bypasses TS6133. Allow declared but unused functions.
// @ts-ignore
function id(d: any[]): any { return d[0]; }
declare var comment: any;
declare var ws: any;
declare var newline: any;
declare var identifier: any;
declare var operator: any;
declare var integer_bin: any;
declare var integer_oct: any;
declare var integer_dec: any;
declare var integer_hex: any;
declare var string_double_quote: any;
declare var lifetime: any;

import lex from '../lexer';
import * as p from '../post_processor';

// Subvert type system
const lexer = lex as any;

interface NearleyToken {  value: any;
  [key: string]: any;
};

interface NearleyLexer {
  reset: (chunk: string, info: any) => void;
  next: () => NearleyToken | undefined;
  save: () => any;
  formatError: (token: NearleyToken) => string;
  has: (tokenType: string) => boolean;
};

interface NearleyRule {
  name: string;
  symbols: NearleySymbol[];
  postprocess?: (d: any[], loc?: number, reject?: {}) => any;
};

type NearleySymbol = string | { literal: any } | { test: (token: any) => boolean };

interface Grammar {
  Lexer: NearleyLexer | undefined;
  ParserRules: NearleyRule[];
  ParserStart: string;
};

const grammar: Grammar = {
  Lexer: lexer,
  ParserRules: [
    {"name": "main$ebnf$1", "symbols": []},
    {"name": "main$ebnf$1$subexpression$1", "symbols": ["_", "stmt"]},
    {"name": "main$ebnf$1", "symbols": ["main$ebnf$1", "main$ebnf$1$subexpression$1"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "main", "symbols": ["main$ebnf$1", "_"], "postprocess": function(data){ return [].concat(...data[0]); }},
    {"name": "__$ebnf$1", "symbols": ["whitespace"]},
    {"name": "__$ebnf$1", "symbols": ["__$ebnf$1", "whitespace"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "__", "symbols": ["__$ebnf$1"], "postprocess": p.whitespace},
    {"name": "_$ebnf$1", "symbols": []},
    {"name": "_$ebnf$1", "symbols": ["_$ebnf$1", "whitespace"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "_", "symbols": ["_$ebnf$1"], "postprocess": p.whitespace},
    {"name": "whitespace", "symbols": [(lexer.has("comment") ? {type: "comment"} : comment)]},
    {"name": "whitespace", "symbols": [(lexer.has("ws") ? {type: "ws"} : ws)]},
    {"name": "whitespace", "symbols": [(lexer.has("newline") ? {type: "newline"} : newline)]},
    {"name": "COMMA", "symbols": ["_", {"literal":","}, "_"]},
    {"name": "declare_function", "symbols": ["df"]},
    {"name": "stmt", "symbols": ["declare_function"]},
    {"name": "df$ebnf$1", "symbols": ["dfReturnType"], "postprocess": id},
    {"name": "df$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "df$ebnf$2", "symbols": ["dfGeneric"], "postprocess": id},
    {"name": "df$ebnf$2", "symbols": [], "postprocess": () => null},
    {"name": "df$ebnf$3", "symbols": ["dfBody"], "postprocess": id},
    {"name": "df$ebnf$3", "symbols": [], "postprocess": () => null},
    {"name": "df", "symbols": ["dfKeyword", "dfName", "dfParameters", "df$ebnf$1", "df$ebnf$2", "df$ebnf$3"], "postprocess": p.Function},
    {"name": "dfKeyword", "symbols": [{"literal":"fn"}, "__"]},
    {"name": "dfName", "symbols": [(lexer.has("identifier") ? {type: "identifier"} : identifier), "_"]},
    {"name": "dfParameters$macrocall$2", "symbols": [{"literal":"("}]},
    {"name": "dfParameters$macrocall$3", "symbols": ["dfParameter"]},
    {"name": "dfParameters$macrocall$4", "symbols": ["COMMA"]},
    {"name": "dfParameters$macrocall$5", "symbols": [{"literal":")"}]},
    {"name": "dfParameters$macrocall$1$ebnf$1$subexpression$1$ebnf$1", "symbols": []},
    {"name": "dfParameters$macrocall$1$ebnf$1$subexpression$1$ebnf$1$subexpression$1", "symbols": ["dfParameters$macrocall$4", "dfParameters$macrocall$3"]},
    {"name": "dfParameters$macrocall$1$ebnf$1$subexpression$1$ebnf$1", "symbols": ["dfParameters$macrocall$1$ebnf$1$subexpression$1$ebnf$1", "dfParameters$macrocall$1$ebnf$1$subexpression$1$ebnf$1$subexpression$1"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "dfParameters$macrocall$1$ebnf$1$subexpression$1", "symbols": ["dfParameters$macrocall$3", "dfParameters$macrocall$1$ebnf$1$subexpression$1$ebnf$1", "_"]},
    {"name": "dfParameters$macrocall$1$ebnf$1", "symbols": ["dfParameters$macrocall$1$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "dfParameters$macrocall$1$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "dfParameters$macrocall$1", "symbols": ["dfParameters$macrocall$2", "_", "dfParameters$macrocall$1$ebnf$1", "dfParameters$macrocall$5"]},
    {"name": "dfParameters", "symbols": ["dfParameters$macrocall$1"], "postprocess": p.STAR},
    {"name": "dfParameter", "symbols": ["declare_function_parameter"]},
    {"name": "dfReturnType", "symbols": ["_", {"literal":":"}, "_", "type"]},
    {"name": "dfGeneric", "symbols": ["_", "declare_generic"]},
    {"name": "dfBody", "symbols": ["_", "dfBodyList"]},
    {"name": "dfBodyList$macrocall$2", "symbols": ["stmt"]},
    {"name": "dfBodyList$macrocall$1$macrocall$2", "symbols": [{"literal":"{"}]},
    {"name": "dfBodyList$macrocall$1$macrocall$3", "symbols": ["dfBodyList$macrocall$2"]},
    {"name": "dfBodyList$macrocall$1$macrocall$4", "symbols": ["__"]},
    {"name": "dfBodyList$macrocall$1$macrocall$5", "symbols": [{"literal":"}"}]},
    {"name": "dfBodyList$macrocall$1$macrocall$1$ebnf$1$subexpression$1$ebnf$1", "symbols": []},
    {"name": "dfBodyList$macrocall$1$macrocall$1$ebnf$1$subexpression$1$ebnf$1$subexpression$1", "symbols": ["dfBodyList$macrocall$1$macrocall$4", "dfBodyList$macrocall$1$macrocall$3"]},
    {"name": "dfBodyList$macrocall$1$macrocall$1$ebnf$1$subexpression$1$ebnf$1", "symbols": ["dfBodyList$macrocall$1$macrocall$1$ebnf$1$subexpression$1$ebnf$1", "dfBodyList$macrocall$1$macrocall$1$ebnf$1$subexpression$1$ebnf$1$subexpression$1"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "dfBodyList$macrocall$1$macrocall$1$ebnf$1$subexpression$1", "symbols": ["dfBodyList$macrocall$1$macrocall$3", "dfBodyList$macrocall$1$macrocall$1$ebnf$1$subexpression$1$ebnf$1", "_"]},
    {"name": "dfBodyList$macrocall$1$macrocall$1$ebnf$1", "symbols": ["dfBodyList$macrocall$1$macrocall$1$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "dfBodyList$macrocall$1$macrocall$1$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "dfBodyList$macrocall$1$macrocall$1", "symbols": ["dfBodyList$macrocall$1$macrocall$2", "_", "dfBodyList$macrocall$1$macrocall$1$ebnf$1", "dfBodyList$macrocall$1$macrocall$5"]},
    {"name": "dfBodyList$macrocall$1", "symbols": ["dfBodyList$macrocall$1$macrocall$1"]},
    {"name": "dfBodyList", "symbols": ["dfBodyList$macrocall$1"], "postprocess": p.STAR},
    {"name": "declare_operator", "symbols": ["do"]},
    {"name": "stmt", "symbols": ["do"]},
    {"name": "do$ebnf$1", "symbols": ["dfReturnType"], "postprocess": id},
    {"name": "do$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "do$ebnf$2", "symbols": ["dfGeneric"], "postprocess": id},
    {"name": "do$ebnf$2", "symbols": [], "postprocess": () => null},
    {"name": "do$ebnf$3", "symbols": ["dfBody"], "postprocess": id},
    {"name": "do$ebnf$3", "symbols": [], "postprocess": () => null},
    {"name": "do", "symbols": ["doKeyword", "doName", "dfParameters", "do$ebnf$1", "do$ebnf$2", "do$ebnf$3"], "postprocess": p.Operator},
    {"name": "doKeyword", "symbols": [{"literal":"op"}, "__"]},
    {"name": "doName", "symbols": [{"literal":"constructor"}, "_"]},
    {"name": "doName", "symbols": [{"literal":"destructor"}, "_"]},
    {"name": "declare_function_parameter", "symbols": ["dfp"]},
    {"name": "dfp$ebnf$1", "symbols": []},
    {"name": "dfp$ebnf$1", "symbols": ["dfp$ebnf$1", "dfpKeyword"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "dfp", "symbols": ["dfp$ebnf$1", (lexer.has("identifier") ? {type: "identifier"} : identifier), "_", {"literal":":"}, "_", "type"], "postprocess": p.parameterNameType},
    {"name": "dfp$ebnf$2", "symbols": []},
    {"name": "dfp$ebnf$2", "symbols": ["dfp$ebnf$2", "dfpKeyword"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "dfp", "symbols": ["dfp$ebnf$2", "type"], "postprocess": p.parameterType},
    {"name": "dfpKeyword", "symbols": [{"literal":"own"}, "__"]},
    {"name": "dfpKeyword", "symbols": [{"literal":"mut"}, "__"]},
    {"name": "declare_generic$ebnf$1", "symbols": []},
    {"name": "declare_generic$ebnf$1", "symbols": ["declare_generic$ebnf$1", "dgWhere"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "declare_generic", "symbols": ["dgKeyword", "dgParameters", "declare_generic$ebnf$1"]},
    {"name": "dgKeyword", "symbols": [{"literal":"generic"}]},
    {"name": "dgParameters$macrocall$2", "symbols": [{"literal":"<"}]},
    {"name": "dgParameters$macrocall$3", "symbols": ["dgParameter"]},
    {"name": "dgParameters$macrocall$4", "symbols": ["COMMA"]},
    {"name": "dgParameters$macrocall$5", "symbols": [{"literal":">"}]},
    {"name": "dgParameters$macrocall$1$ebnf$1", "symbols": []},
    {"name": "dgParameters$macrocall$1$ebnf$1$subexpression$1", "symbols": ["dgParameters$macrocall$4", "dgParameters$macrocall$3"]},
    {"name": "dgParameters$macrocall$1$ebnf$1", "symbols": ["dgParameters$macrocall$1$ebnf$1", "dgParameters$macrocall$1$ebnf$1$subexpression$1"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "dgParameters$macrocall$1", "symbols": ["dgParameters$macrocall$2", "_", "dgParameters$macrocall$3", "dgParameters$macrocall$1$ebnf$1", "_", "dgParameters$macrocall$5"]},
    {"name": "dgParameters", "symbols": ["dgParameters$macrocall$1"], "postprocess": p.PLUS},
    {"name": "dgParameter", "symbols": [(lexer.has("identifier") ? {type: "identifier"} : identifier)]},
    {"name": "dgWhere", "symbols": ["_", {"literal":"where"}, "__", "dgWhereQuery"]},
    {"name": "dgWhereQuery", "symbols": [(lexer.has("identifier") ? {type: "identifier"} : identifier), "__", {"literal":"is"}, "__", "type"]},
    {"name": "declare_trait", "symbols": ["dt"]},
    {"name": "stmt", "symbols": ["declare_trait"]},
    {"name": "dt$ebnf$1", "symbols": []},
    {"name": "dt$ebnf$1", "symbols": ["dt$ebnf$1", "dtImplements"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "dt$ebnf$2", "symbols": ["dtGeneric"], "postprocess": id},
    {"name": "dt$ebnf$2", "symbols": [], "postprocess": () => null},
    {"name": "dt$ebnf$3", "symbols": ["dtBody"], "postprocess": id},
    {"name": "dt$ebnf$3", "symbols": [], "postprocess": () => null},
    {"name": "dt", "symbols": ["dtKeyword", "dtName", "dt$ebnf$1", "dt$ebnf$2", "dt$ebnf$3"], "postprocess": p.Trait},
    {"name": "dtKeyword", "symbols": [{"literal":"trait"}, "__"]},
    {"name": "dtKeyword", "symbols": [{"literal":"class"}, "__"]},
    {"name": "dtName", "symbols": [(lexer.has("identifier") ? {type: "identifier"} : identifier)]},
    {"name": "dtImplements", "symbols": ["__", {"literal":"impl"}, "__", "type"]},
    {"name": "dtGeneric", "symbols": ["__", "declare_generic"]},
    {"name": "dtBody", "symbols": ["_", "dtBodyList"]},
    {"name": "dtBodyList$macrocall$2", "symbols": ["stmt"]},
    {"name": "dtBodyList$macrocall$1$macrocall$2", "symbols": [{"literal":"{"}]},
    {"name": "dtBodyList$macrocall$1$macrocall$3", "symbols": ["dtBodyList$macrocall$2"]},
    {"name": "dtBodyList$macrocall$1$macrocall$4", "symbols": ["__"]},
    {"name": "dtBodyList$macrocall$1$macrocall$5", "symbols": [{"literal":"}"}]},
    {"name": "dtBodyList$macrocall$1$macrocall$1$ebnf$1$subexpression$1$ebnf$1", "symbols": []},
    {"name": "dtBodyList$macrocall$1$macrocall$1$ebnf$1$subexpression$1$ebnf$1$subexpression$1", "symbols": ["dtBodyList$macrocall$1$macrocall$4", "dtBodyList$macrocall$1$macrocall$3"]},
    {"name": "dtBodyList$macrocall$1$macrocall$1$ebnf$1$subexpression$1$ebnf$1", "symbols": ["dtBodyList$macrocall$1$macrocall$1$ebnf$1$subexpression$1$ebnf$1", "dtBodyList$macrocall$1$macrocall$1$ebnf$1$subexpression$1$ebnf$1$subexpression$1"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "dtBodyList$macrocall$1$macrocall$1$ebnf$1$subexpression$1", "symbols": ["dtBodyList$macrocall$1$macrocall$3", "dtBodyList$macrocall$1$macrocall$1$ebnf$1$subexpression$1$ebnf$1", "_"]},
    {"name": "dtBodyList$macrocall$1$macrocall$1$ebnf$1", "symbols": ["dtBodyList$macrocall$1$macrocall$1$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "dtBodyList$macrocall$1$macrocall$1$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "dtBodyList$macrocall$1$macrocall$1", "symbols": ["dtBodyList$macrocall$1$macrocall$2", "_", "dtBodyList$macrocall$1$macrocall$1$ebnf$1", "dtBodyList$macrocall$1$macrocall$5"]},
    {"name": "dtBodyList$macrocall$1", "symbols": ["dtBodyList$macrocall$1$macrocall$1"]},
    {"name": "dtBodyList", "symbols": ["dtBodyList$macrocall$1"], "postprocess": p.STAR},
    {"name": "declare_variable", "symbols": ["dv"]},
    {"name": "stmt", "symbols": ["declare_variable"]},
    {"name": "dv$ebnf$1", "symbols": ["dvType"], "postprocess": id},
    {"name": "dv$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "dv$ebnf$2", "symbols": ["dvValue"], "postprocess": id},
    {"name": "dv$ebnf$2", "symbols": [], "postprocess": () => null},
    {"name": "dv", "symbols": ["dvKeyword", "dvName", "dv$ebnf$1", "dv$ebnf$2"], "postprocess": p.Variable},
    {"name": "dvKeyword", "symbols": [{"literal":"mut"}, "__"]},
    {"name": "dvKeyword", "symbols": [{"literal":"val"}, "__"]},
    {"name": "dvName", "symbols": [(lexer.has("identifier") ? {type: "identifier"} : identifier)]},
    {"name": "dvType", "symbols": ["_", {"literal":":"}, "_", "type"]},
    {"name": "dvValue$ebnf$1", "symbols": ["binaryOp"], "postprocess": id},
    {"name": "dvValue$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "dvValue", "symbols": ["_", {"literal":"="}, "dvValue$ebnf$1", "_", "expr"]},
    {"name": "expr", "symbols": ["binaryExpr"]},
    {"name": "binaryOp$ebnf$1$subexpression$1", "symbols": [(lexer.has("operator") ? {type: "operator"} : operator)]},
    {"name": "binaryOp$ebnf$1$subexpression$1", "symbols": [{"literal":">"}]},
    {"name": "binaryOp$ebnf$1$subexpression$1", "symbols": [{"literal":"<"}]},
    {"name": "binaryOp$ebnf$1", "symbols": ["binaryOp$ebnf$1$subexpression$1"]},
    {"name": "binaryOp$ebnf$1$subexpression$2", "symbols": [(lexer.has("operator") ? {type: "operator"} : operator)]},
    {"name": "binaryOp$ebnf$1$subexpression$2", "symbols": [{"literal":">"}]},
    {"name": "binaryOp$ebnf$1$subexpression$2", "symbols": [{"literal":"<"}]},
    {"name": "binaryOp$ebnf$1", "symbols": ["binaryOp$ebnf$1", "binaryOp$ebnf$1$subexpression$2"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "binaryOp", "symbols": ["binaryOp$ebnf$1"]},
    {"name": "unaryOp$ebnf$1", "symbols": []},
    {"name": "unaryOp$ebnf$1$subexpression$1", "symbols": [(lexer.has("operator") ? {type: "operator"} : operator)]},
    {"name": "unaryOp$ebnf$1$subexpression$1", "symbols": [{"literal":">"}]},
    {"name": "unaryOp$ebnf$1$subexpression$1", "symbols": [{"literal":"<"}]},
    {"name": "unaryOp$ebnf$1", "symbols": ["unaryOp$ebnf$1", "unaryOp$ebnf$1$subexpression$1"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "unaryOp", "symbols": [(lexer.has("operator") ? {type: "operator"} : operator), "unaryOp$ebnf$1"], "postprocess": function(node, location, reject){if(node[0].value === "."){return reject} return node;}},
    {"name": "binaryExpr", "symbols": ["unaryExpr", "__", "binaryOp", "__", "unaryExpr"], "postprocess": p.ExOpInfix},
    {"name": "binaryExpr", "symbols": ["unaryExpr", "unaryOp", "unaryExpr"], "postprocess": p.ExOpInfix},
    {"name": "binaryExpr", "symbols": ["unaryExpr"]},
    {"name": "unaryExpr", "symbols": ["unaryOp", "atom"], "postprocess": p.ExOpPrefix},
    {"name": "unaryExpr", "symbols": ["atom", "unaryOp"], "postprocess": p.ExOpPostfix},
    {"name": "unaryExpr", "symbols": ["atom"]},
    {"name": "atom", "symbols": [(lexer.has("identifier") ? {type: "identifier"} : identifier)], "postprocess": p.ExVariable},
    {"name": "atom", "symbols": [{"literal":"("}, "expr", {"literal":")"}]},
    {"name": "expression_call", "symbols": ["ecallTarget", "ecallArguments"], "postprocess": p.ExCall},
    {"name": "stmt", "symbols": ["expression_call"]},
    {"name": "atom", "symbols": ["expression_call"]},
    {"name": "ecallTarget", "symbols": ["atom"]},
    {"name": "ecallArguments$macrocall$2", "symbols": [{"literal":"("}]},
    {"name": "ecallArguments$macrocall$3", "symbols": ["expr"]},
    {"name": "ecallArguments$macrocall$4", "symbols": ["COMMA"]},
    {"name": "ecallArguments$macrocall$5", "symbols": [{"literal":")"}]},
    {"name": "ecallArguments$macrocall$1$ebnf$1$subexpression$1$ebnf$1", "symbols": []},
    {"name": "ecallArguments$macrocall$1$ebnf$1$subexpression$1$ebnf$1$subexpression$1", "symbols": ["ecallArguments$macrocall$4", "ecallArguments$macrocall$3"]},
    {"name": "ecallArguments$macrocall$1$ebnf$1$subexpression$1$ebnf$1", "symbols": ["ecallArguments$macrocall$1$ebnf$1$subexpression$1$ebnf$1", "ecallArguments$macrocall$1$ebnf$1$subexpression$1$ebnf$1$subexpression$1"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "ecallArguments$macrocall$1$ebnf$1$subexpression$1", "symbols": ["ecallArguments$macrocall$3", "ecallArguments$macrocall$1$ebnf$1$subexpression$1$ebnf$1", "_"]},
    {"name": "ecallArguments$macrocall$1$ebnf$1", "symbols": ["ecallArguments$macrocall$1$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "ecallArguments$macrocall$1$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "ecallArguments$macrocall$1", "symbols": ["ecallArguments$macrocall$2", "_", "ecallArguments$macrocall$1$ebnf$1", "ecallArguments$macrocall$5"]},
    {"name": "ecallArguments", "symbols": ["ecallArguments$macrocall$1"], "postprocess": p.STAR},
    {"name": "expression_construct", "symbols": ["atom", "econArguments"], "postprocess": p.ExConstruct},
    {"name": "atom", "symbols": ["expression_construct"]},
    {"name": "econArguments$macrocall$2", "symbols": [{"literal":"{"}]},
    {"name": "econArguments$macrocall$3", "symbols": ["econArgument"]},
    {"name": "econArguments$macrocall$4", "symbols": ["COMMA"]},
    {"name": "econArguments$macrocall$5", "symbols": [{"literal":"}"}]},
    {"name": "econArguments$macrocall$1$ebnf$1$subexpression$1$ebnf$1", "symbols": []},
    {"name": "econArguments$macrocall$1$ebnf$1$subexpression$1$ebnf$1$subexpression$1", "symbols": ["econArguments$macrocall$4", "econArguments$macrocall$3"]},
    {"name": "econArguments$macrocall$1$ebnf$1$subexpression$1$ebnf$1", "symbols": ["econArguments$macrocall$1$ebnf$1$subexpression$1$ebnf$1", "econArguments$macrocall$1$ebnf$1$subexpression$1$ebnf$1$subexpression$1"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "econArguments$macrocall$1$ebnf$1$subexpression$1", "symbols": ["econArguments$macrocall$3", "econArguments$macrocall$1$ebnf$1$subexpression$1$ebnf$1", "_"]},
    {"name": "econArguments$macrocall$1$ebnf$1", "symbols": ["econArguments$macrocall$1$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "econArguments$macrocall$1$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "econArguments$macrocall$1", "symbols": ["econArguments$macrocall$2", "_", "econArguments$macrocall$1$ebnf$1", "econArguments$macrocall$5"]},
    {"name": "econArguments", "symbols": ["econArguments$macrocall$1"], "postprocess": p.STAR},
    {"name": "econArgument", "symbols": ["expr"]},
    {"name": "econArgument", "symbols": [(lexer.has("identifier") ? {type: "identifier"} : identifier), "_", {"literal":":"}, "_", "expr"]},
    {"name": "expression_index_bracket", "symbols": ["eibTarget", "eibIndex"]},
    {"name": "eibTarget", "symbols": ["atom"]},
    {"name": "eibIndex$macrocall$2", "symbols": [{"literal":"["}]},
    {"name": "eibIndex$macrocall$3", "symbols": ["expr"]},
    {"name": "eibIndex$macrocall$4", "symbols": ["COMMA"]},
    {"name": "eibIndex$macrocall$5", "symbols": [{"literal":"]"}]},
    {"name": "eibIndex$macrocall$1$ebnf$1", "symbols": []},
    {"name": "eibIndex$macrocall$1$ebnf$1$subexpression$1", "symbols": ["eibIndex$macrocall$4", "eibIndex$macrocall$3"]},
    {"name": "eibIndex$macrocall$1$ebnf$1", "symbols": ["eibIndex$macrocall$1$ebnf$1", "eibIndex$macrocall$1$ebnf$1$subexpression$1"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "eibIndex$macrocall$1", "symbols": ["eibIndex$macrocall$2", "_", "eibIndex$macrocall$3", "eibIndex$macrocall$1$ebnf$1", "_", "eibIndex$macrocall$5"]},
    {"name": "eibIndex", "symbols": ["eibIndex$macrocall$1"], "postprocess": p.PLUS},
    {"name": "atom", "symbols": ["expression_index_bracket"]},
    {"name": "expression_index_dot", "symbols": ["eidTarget", "eidSymbol", "eidName"], "postprocess": p.ExprIndexDot},
    {"name": "eidTarget", "symbols": ["atom"]},
    {"name": "eidSymbol", "symbols": ["_", {"literal":"."}, "_"]},
    {"name": "eidName", "symbols": [(lexer.has("identifier") ? {type: "identifier"} : identifier)]},
    {"name": "atom", "symbols": ["expression_index_dot"]},
    {"name": "expression_return", "symbols": ["erKeyword", "erValue"], "postprocess": p.ExReturn},
    {"name": "erKeyword", "symbols": [{"literal":"return"}]},
    {"name": "erValue", "symbols": ["__", "expr"]},
    {"name": "stmt", "symbols": ["expression_return"]},
    {"name": "literal_integer", "symbols": [(lexer.has("integer_bin") ? {type: "integer_bin"} : integer_bin)], "postprocess": p.LiteralInteger},
    {"name": "literal_integer", "symbols": [(lexer.has("integer_oct") ? {type: "integer_oct"} : integer_oct)], "postprocess": p.LiteralInteger},
    {"name": "literal_integer", "symbols": [(lexer.has("integer_dec") ? {type: "integer_dec"} : integer_dec)], "postprocess": p.LiteralInteger},
    {"name": "literal_integer", "symbols": [(lexer.has("integer_hex") ? {type: "integer_hex"} : integer_hex)], "postprocess": p.LiteralInteger},
    {"name": "atom", "symbols": ["literal_integer"]},
    {"name": "literal_string", "symbols": [(lexer.has("string_double_quote") ? {type: "string_double_quote"} : string_double_quote)], "postprocess": p.LiteralString},
    {"name": "atom", "symbols": ["literal_string"]},
    {"name": "StmtAssign", "symbols": ["saAssignable", "saOperator", "saValue"], "postprocess": p.StmtAssign},
    {"name": "saAssignable", "symbols": [(lexer.has("identifier") ? {type: "identifier"} : identifier)]},
    {"name": "saAssignable", "symbols": ["expression_index_dot"]},
    {"name": "saAssignable", "symbols": ["expression_index_bracket"]},
    {"name": "saOperator", "symbols": ["__", "binaryOp", "__"]},
    {"name": "saValue", "symbols": ["expr"]},
    {"name": "stmt", "symbols": ["StmtAssign"]},
    {"name": "type$ebnf$1", "symbols": ["tLifetime"], "postprocess": id},
    {"name": "type$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "type", "symbols": ["tExpr", "type$ebnf$1"]},
    {"name": "tExpr", "symbols": ["tAtom"]},
    {"name": "tAtom", "symbols": [(lexer.has("identifier") ? {type: "identifier"} : identifier)]},
    {"name": "tLifetime", "symbols": ["_", (lexer.has("lifetime") ? {type: "lifetime"} : lifetime)]},
    {"name": "type_index_dot", "symbols": ["tExpr", "tidSymbol", "tidName"]},
    {"name": "tidSymbol", "symbols": ["_", {"literal":"."}, "_"]},
    {"name": "tidName", "symbols": [(lexer.has("identifier") ? {type: "identifier"} : identifier)]},
    {"name": "tExpr", "symbols": ["type_index_dot"]},
    {"name": "type_generic", "symbols": ["tgTarget", "tgParameters"]},
    {"name": "tgTarget", "symbols": ["tExpr"]},
    {"name": "tgParameters$macrocall$2", "symbols": [{"literal":"<"}]},
    {"name": "tgParameters$macrocall$3", "symbols": ["tgParameter"]},
    {"name": "tgParameters$macrocall$4", "symbols": ["COMMA"]},
    {"name": "tgParameters$macrocall$5", "symbols": [{"literal":">"}]},
    {"name": "tgParameters$macrocall$1$ebnf$1$subexpression$1$ebnf$1", "symbols": []},
    {"name": "tgParameters$macrocall$1$ebnf$1$subexpression$1$ebnf$1$subexpression$1", "symbols": ["tgParameters$macrocall$4", "tgParameters$macrocall$3"]},
    {"name": "tgParameters$macrocall$1$ebnf$1$subexpression$1$ebnf$1", "symbols": ["tgParameters$macrocall$1$ebnf$1$subexpression$1$ebnf$1", "tgParameters$macrocall$1$ebnf$1$subexpression$1$ebnf$1$subexpression$1"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "tgParameters$macrocall$1$ebnf$1$subexpression$1", "symbols": ["tgParameters$macrocall$3", "tgParameters$macrocall$1$ebnf$1$subexpression$1$ebnf$1", "_"]},
    {"name": "tgParameters$macrocall$1$ebnf$1", "symbols": ["tgParameters$macrocall$1$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "tgParameters$macrocall$1$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "tgParameters$macrocall$1", "symbols": ["tgParameters$macrocall$2", "_", "tgParameters$macrocall$1$ebnf$1", "tgParameters$macrocall$5"]},
    {"name": "tgParameters", "symbols": ["tgParameters$macrocall$1"]},
    {"name": "tgParameter", "symbols": ["type"]},
    {"name": "tExpr", "symbols": ["type_generic"]}
  ],
  ParserStart: "main",
};

export default grammar;
