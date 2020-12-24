// Generated automatically by nearley, version 2.19.1
// http://github.com/Hardmath123/nearley
// Bypasses TS6133. Allow declared but unused functions.
// @ts-ignore
function id(d: any[]): any { return d[0]; }
declare var operator: any;
declare var string_double_quote: any;
declare var integer_bin: any;
declare var integer_dec: any;
declare var integer_hex: any;
declare var integer_oct: any;
declare var identifier: any;
declare var newline: any;
declare var comment: any;
declare var ws: any;
declare var comma: any;

    import lex from '../lexer';
    import * as p from '../post_processor';

    const lexer = lex as any;       // Subvert type system
    
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
    {"name": "main$ebnf$1$subexpression$1", "symbols": ["StmtSep", "Stmt"]},
    {"name": "main$ebnf$1", "symbols": ["main$ebnf$1", "main$ebnf$1$subexpression$1"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "main", "symbols": ["main$ebnf$1", "StmtSep"], "postprocess": function(data){ return [].concat(...data[0]); }},
    {"name": "DeclVariable$ebnf$1", "symbols": ["DvType"], "postprocess": id},
    {"name": "DeclVariable$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "DeclVariable$ebnf$2", "symbols": []},
    {"name": "DeclVariable$ebnf$2", "symbols": ["DeclVariable$ebnf$2", "DvAttribute"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "DeclVariable$ebnf$3", "symbols": ["DvValue"], "postprocess": id},
    {"name": "DeclVariable$ebnf$3", "symbols": [], "postprocess": () => null},
    {"name": "DeclVariable", "symbols": ["DvKeyword", "DvName", "DeclVariable$ebnf$1", "DeclVariable$ebnf$2", "DeclVariable$ebnf$3"], "postprocess": p.DeclVariable},
    {"name": "DvKeyword", "symbols": [{"literal":"val"}, "__"]},
    {"name": "DvKeyword", "symbols": [{"literal":"mut"}, "__"]},
    {"name": "DvName$ebnf$1", "symbols": ["CompileTime"], "postprocess": id},
    {"name": "DvName$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "DvName", "symbols": ["Identifier", "DvName$ebnf$1"]},
    {"name": "DvType", "symbols": ["_", {"literal":":"}, "_", "Type"]},
    {"name": "DvAttribute", "symbols": ["__", "Attribute"]},
    {"name": "DvValue", "symbols": ["_", {"literal":"="}, "_", "Expr"]},
    {"name": "Stmt", "symbols": ["DeclVariable"]},
    {"name": "DeclFunction$ebnf$1", "symbols": ["DfReturnType"], "postprocess": id},
    {"name": "DeclFunction$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "DeclFunction$ebnf$2", "symbols": ["DfGeneric"], "postprocess": id},
    {"name": "DeclFunction$ebnf$2", "symbols": [], "postprocess": () => null},
    {"name": "DeclFunction$ebnf$3", "symbols": []},
    {"name": "DeclFunction$ebnf$3", "symbols": ["DeclFunction$ebnf$3", "DfAttribute"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "DeclFunction$ebnf$4", "symbols": ["DfBody"], "postprocess": id},
    {"name": "DeclFunction$ebnf$4", "symbols": [], "postprocess": () => null},
    {"name": "DeclFunction", "symbols": ["DfKeyword", "DfName", "DfParameters", "DeclFunction$ebnf$1", "DeclFunction$ebnf$2", "DeclFunction$ebnf$3", "DeclFunction$ebnf$4"], "postprocess": p.DeclFunction},
    {"name": "DfKeyword", "symbols": [{"literal":"fn"}, "__"]},
    {"name": "DfKeyword", "symbols": [{"literal":"op"}, "__"]},
    {"name": "DfName$ebnf$1", "symbols": ["CompileTime"], "postprocess": id},
    {"name": "DfName$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "DfName", "symbols": ["Identifier", "DfName$ebnf$1"]},
    {"name": "DfParameters$macrocall$2", "symbols": [{"literal":"("}]},
    {"name": "DfParameters$macrocall$3", "symbols": ["DeclParameter"]},
    {"name": "DfParameters$macrocall$4", "symbols": ["COMMA"]},
    {"name": "DfParameters$macrocall$5", "symbols": [{"literal":")"}]},
    {"name": "DfParameters$macrocall$1$ebnf$1$subexpression$1$ebnf$1", "symbols": []},
    {"name": "DfParameters$macrocall$1$ebnf$1$subexpression$1$ebnf$1$subexpression$1", "symbols": ["DfParameters$macrocall$4", "DfParameters$macrocall$3"]},
    {"name": "DfParameters$macrocall$1$ebnf$1$subexpression$1$ebnf$1", "symbols": ["DfParameters$macrocall$1$ebnf$1$subexpression$1$ebnf$1", "DfParameters$macrocall$1$ebnf$1$subexpression$1$ebnf$1$subexpression$1"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "DfParameters$macrocall$1$ebnf$1$subexpression$1", "symbols": ["DfParameters$macrocall$3", "DfParameters$macrocall$1$ebnf$1$subexpression$1$ebnf$1", "_"]},
    {"name": "DfParameters$macrocall$1$ebnf$1", "symbols": ["DfParameters$macrocall$1$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "DfParameters$macrocall$1$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "DfParameters$macrocall$1", "symbols": ["DfParameters$macrocall$2", "_", "DfParameters$macrocall$1$ebnf$1", "DfParameters$macrocall$5"], "postprocess": p.ListProcessor},
    {"name": "DfParameters", "symbols": ["DfParameters$macrocall$1"]},
    {"name": "DfReturnType", "symbols": ["_", {"literal":":"}, "_", "Type"]},
    {"name": "DfGeneric", "symbols": ["__", "DeclGeneric"]},
    {"name": "DfAttribute", "symbols": ["__", "Attribute"]},
    {"name": "DfBody$macrocall$2", "symbols": ["Stmt"]},
    {"name": "DfBody$macrocall$1$ebnf$1", "symbols": []},
    {"name": "DfBody$macrocall$1$ebnf$1$subexpression$1", "symbols": ["StmtSep", "Stmt"]},
    {"name": "DfBody$macrocall$1$ebnf$1", "symbols": ["DfBody$macrocall$1$ebnf$1", "DfBody$macrocall$1$ebnf$1$subexpression$1"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "DfBody$macrocall$1", "symbols": [{"literal":"{"}, "DfBody$macrocall$1$ebnf$1", "StmtSep", {"literal":"}"}]},
    {"name": "DfBody", "symbols": ["_", "DfBody$macrocall$1"]},
    {"name": "Stmt", "symbols": ["DeclFunction"]},
    {"name": "DeclParameter$ebnf$1", "symbols": ["DpKeyword"], "postprocess": id},
    {"name": "DeclParameter$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "DeclParameter$ebnf$2", "symbols": ["DpType"], "postprocess": id},
    {"name": "DeclParameter$ebnf$2", "symbols": [], "postprocess": () => null},
    {"name": "DeclParameter$ebnf$3", "symbols": []},
    {"name": "DeclParameter$ebnf$3", "symbols": ["DeclParameter$ebnf$3", "DpAttribute"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "DeclParameter$ebnf$4", "symbols": ["DpValue"], "postprocess": id},
    {"name": "DeclParameter$ebnf$4", "symbols": [], "postprocess": () => null},
    {"name": "DeclParameter", "symbols": ["DeclParameter$ebnf$1", "DpName", "DeclParameter$ebnf$2", "DeclParameter$ebnf$3", "DeclParameter$ebnf$4"]},
    {"name": "DpKeyword", "symbols": [{"literal":"own"}, "__"]},
    {"name": "DpKeyword", "symbols": [{"literal":"mut"}, "__"]},
    {"name": "DpName$ebnf$1", "symbols": ["CompileTime"], "postprocess": id},
    {"name": "DpName$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "DpName", "symbols": ["Identifier", "DpName$ebnf$1"]},
    {"name": "DpType", "symbols": ["_", {"literal":":"}, "_", "Type"]},
    {"name": "DpAttribute", "symbols": ["__", "Attribute"]},
    {"name": "DpValue", "symbols": ["_", {"literal":"="}, "_", "Expr"]},
    {"name": "DeclClass$ebnf$1", "symbols": []},
    {"name": "DeclClass$ebnf$1", "symbols": ["DeclClass$ebnf$1", "DcImplement"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "DeclClass$ebnf$2", "symbols": ["DcGeneric"], "postprocess": id},
    {"name": "DeclClass$ebnf$2", "symbols": [], "postprocess": () => null},
    {"name": "DeclClass$ebnf$3", "symbols": []},
    {"name": "DeclClass$ebnf$3", "symbols": ["DeclClass$ebnf$3", "DcAttribute"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "DeclClass$ebnf$4", "symbols": ["DcBody"], "postprocess": id},
    {"name": "DeclClass$ebnf$4", "symbols": [], "postprocess": () => null},
    {"name": "DeclClass", "symbols": ["DcKeyword", "DcName", "DeclClass$ebnf$1", "DeclClass$ebnf$2", "DeclClass$ebnf$3", "DeclClass$ebnf$4"], "postprocess": p.DeclClass},
    {"name": "DcKeyword", "symbols": [{"literal":"class"}, "__"]},
    {"name": "DcName", "symbols": ["Identifier"]},
    {"name": "DcImplement", "symbols": ["__", {"literal":"impl"}, "__", "Type"]},
    {"name": "DcGeneric", "symbols": ["__", "DeclGeneric"]},
    {"name": "DcAttribute", "symbols": ["__", "Attribute"]},
    {"name": "DcBody$macrocall$2", "symbols": ["Stmt"]},
    {"name": "DcBody$macrocall$1$ebnf$1", "symbols": []},
    {"name": "DcBody$macrocall$1$ebnf$1$subexpression$1", "symbols": ["StmtSep", "Stmt"]},
    {"name": "DcBody$macrocall$1$ebnf$1", "symbols": ["DcBody$macrocall$1$ebnf$1", "DcBody$macrocall$1$ebnf$1$subexpression$1"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "DcBody$macrocall$1", "symbols": [{"literal":"{"}, "DcBody$macrocall$1$ebnf$1", "StmtSep", {"literal":"}"}]},
    {"name": "DcBody", "symbols": ["_", "DcBody$macrocall$1"]},
    {"name": "Stmt", "symbols": ["DeclClass"]},
    {"name": "DeclGeneric$ebnf$1", "symbols": []},
    {"name": "DeclGeneric$ebnf$1", "symbols": ["DeclGeneric$ebnf$1", "DgWhere"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "DeclGeneric", "symbols": ["DgKeyword", "DgParameters", "DeclGeneric$ebnf$1"]},
    {"name": "DgKeyword", "symbols": [{"literal":"generic"}]},
    {"name": "DgParameters$macrocall$2", "symbols": [{"literal":"<"}]},
    {"name": "DgParameters$macrocall$3", "symbols": ["DgParameter"]},
    {"name": "DgParameters$macrocall$4", "symbols": ["COMMA"]},
    {"name": "DgParameters$macrocall$5", "symbols": [{"literal":">"}]},
    {"name": "DgParameters$macrocall$1$subexpression$1$ebnf$1", "symbols": []},
    {"name": "DgParameters$macrocall$1$subexpression$1$ebnf$1$subexpression$1", "symbols": ["DgParameters$macrocall$4", "DgParameters$macrocall$3"]},
    {"name": "DgParameters$macrocall$1$subexpression$1$ebnf$1", "symbols": ["DgParameters$macrocall$1$subexpression$1$ebnf$1", "DgParameters$macrocall$1$subexpression$1$ebnf$1$subexpression$1"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "DgParameters$macrocall$1$subexpression$1", "symbols": ["DgParameters$macrocall$3", "DgParameters$macrocall$1$subexpression$1$ebnf$1", "_"]},
    {"name": "DgParameters$macrocall$1", "symbols": ["DgParameters$macrocall$2", "_", "DgParameters$macrocall$1$subexpression$1", "DgParameters$macrocall$5"], "postprocess": p.ListProcessor},
    {"name": "DgParameters", "symbols": ["DgParameters$macrocall$1"]},
    {"name": "DgParameter", "symbols": ["Identifier"]},
    {"name": "DgWhere", "symbols": ["__", {"literal":"where"}, "__", "Identifier", "__", {"literal":"impl"}, "__", "Type"]},
    {"name": "Expr", "symbols": ["BinaryExpr"]},
    {"name": "OperatorSpaced$ebnf$1", "symbols": [(lexer.has("operator") ? {type: "operator"} : operator)], "postprocess": id},
    {"name": "OperatorSpaced$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "OperatorSpaced", "symbols": [{"literal":"<"}, "OperatorSpaced$ebnf$1"]},
    {"name": "OperatorSpaced$ebnf$2", "symbols": [(lexer.has("operator") ? {type: "operator"} : operator)], "postprocess": id},
    {"name": "OperatorSpaced$ebnf$2", "symbols": [], "postprocess": () => null},
    {"name": "OperatorSpaced", "symbols": [{"literal":">"}, "OperatorSpaced$ebnf$2"]},
    {"name": "OperatorSpaced", "symbols": [(lexer.has("operator") ? {type: "operator"} : operator)], "postprocess": p.RejectOperators},
    {"name": "Operator", "symbols": [(lexer.has("operator") ? {type: "operator"} : operator)], "postprocess": p.RejectOperators},
    {"name": "BinaryExpr", "symbols": ["UnaryExpr", "__", "OperatorSpaced", "__", "BinaryExpr"]},
    {"name": "BinaryExpr", "symbols": ["Atom", "Operator", "Atom"]},
    {"name": "BinaryExpr", "symbols": ["UnaryExpr"]},
    {"name": "UnaryExpr", "symbols": ["Operator", "Atom"]},
    {"name": "UnaryExpr", "symbols": ["Atom", "Operator"]},
    {"name": "UnaryExpr", "symbols": ["Atom"]},
    {"name": "Atom", "symbols": [{"literal":"("}, "Expr", {"literal":")"}]},
    {"name": "Atom", "symbols": ["Identifier"]},
    {"name": "Atom", "symbols": [(lexer.has("string_double_quote") ? {type: "string_double_quote"} : string_double_quote)]},
    {"name": "Atom", "symbols": [(lexer.has("integer_bin") ? {type: "integer_bin"} : integer_bin)]},
    {"name": "Atom", "symbols": [(lexer.has("integer_dec") ? {type: "integer_dec"} : integer_dec)]},
    {"name": "Atom", "symbols": [(lexer.has("integer_hex") ? {type: "integer_hex"} : integer_hex)]},
    {"name": "Atom", "symbols": [(lexer.has("integer_oct") ? {type: "integer_oct"} : integer_oct)]},
    {"name": "ExprList$macrocall$2", "symbols": [{"literal":"["}]},
    {"name": "ExprList$macrocall$3", "symbols": ["Expr"]},
    {"name": "ExprList$macrocall$4", "symbols": ["COMMA"]},
    {"name": "ExprList$macrocall$5", "symbols": [{"literal":"]"}]},
    {"name": "ExprList$macrocall$1$ebnf$1$subexpression$1$ebnf$1", "symbols": []},
    {"name": "ExprList$macrocall$1$ebnf$1$subexpression$1$ebnf$1$subexpression$1", "symbols": ["ExprList$macrocall$4", "ExprList$macrocall$3"]},
    {"name": "ExprList$macrocall$1$ebnf$1$subexpression$1$ebnf$1", "symbols": ["ExprList$macrocall$1$ebnf$1$subexpression$1$ebnf$1", "ExprList$macrocall$1$ebnf$1$subexpression$1$ebnf$1$subexpression$1"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "ExprList$macrocall$1$ebnf$1$subexpression$1", "symbols": ["ExprList$macrocall$3", "ExprList$macrocall$1$ebnf$1$subexpression$1$ebnf$1", "_"]},
    {"name": "ExprList$macrocall$1$ebnf$1", "symbols": ["ExprList$macrocall$1$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "ExprList$macrocall$1$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "ExprList$macrocall$1", "symbols": ["ExprList$macrocall$2", "_", "ExprList$macrocall$1$ebnf$1", "ExprList$macrocall$5"], "postprocess": p.ListProcessor},
    {"name": "ExprList", "symbols": ["ExprList$macrocall$1"]},
    {"name": "Atom", "symbols": ["ExprList"]},
    {"name": "ExprDictionary$macrocall$2", "symbols": [{"literal":"{"}]},
    {"name": "ExprDictionary$macrocall$3", "symbols": ["LdEntry"]},
    {"name": "ExprDictionary$macrocall$4", "symbols": ["COMMA"]},
    {"name": "ExprDictionary$macrocall$5", "symbols": [{"literal":"}"}]},
    {"name": "ExprDictionary$macrocall$1$ebnf$1$subexpression$1$ebnf$1", "symbols": []},
    {"name": "ExprDictionary$macrocall$1$ebnf$1$subexpression$1$ebnf$1$subexpression$1", "symbols": ["ExprDictionary$macrocall$4", "ExprDictionary$macrocall$3"]},
    {"name": "ExprDictionary$macrocall$1$ebnf$1$subexpression$1$ebnf$1", "symbols": ["ExprDictionary$macrocall$1$ebnf$1$subexpression$1$ebnf$1", "ExprDictionary$macrocall$1$ebnf$1$subexpression$1$ebnf$1$subexpression$1"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "ExprDictionary$macrocall$1$ebnf$1$subexpression$1", "symbols": ["ExprDictionary$macrocall$3", "ExprDictionary$macrocall$1$ebnf$1$subexpression$1$ebnf$1", "_"]},
    {"name": "ExprDictionary$macrocall$1$ebnf$1", "symbols": ["ExprDictionary$macrocall$1$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "ExprDictionary$macrocall$1$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "ExprDictionary$macrocall$1", "symbols": ["ExprDictionary$macrocall$2", "_", "ExprDictionary$macrocall$1$ebnf$1", "ExprDictionary$macrocall$5"], "postprocess": p.ListProcessor},
    {"name": "ExprDictionary", "symbols": ["ExprDictionary$macrocall$1"]},
    {"name": "LdEntry", "symbols": ["Identifier", "_", {"literal":":"}, "_", "Expr"]},
    {"name": "Atom", "symbols": ["ExprDictionary"]},
    {"name": "ExprConstruct", "symbols": ["EbTarget", "EbArguments"]},
    {"name": "EbTarget$ebnf$1", "symbols": ["CompileTime"], "postprocess": id},
    {"name": "EbTarget$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "EbTarget", "symbols": ["Atom", "EbTarget$ebnf$1"]},
    {"name": "EbArguments$macrocall$2", "symbols": [{"literal":"{"}]},
    {"name": "EbArguments$macrocall$3", "symbols": ["EcArgument"]},
    {"name": "EbArguments$macrocall$4", "symbols": ["COMMA"]},
    {"name": "EbArguments$macrocall$5", "symbols": [{"literal":"}"}]},
    {"name": "EbArguments$macrocall$1$ebnf$1$subexpression$1$ebnf$1", "symbols": []},
    {"name": "EbArguments$macrocall$1$ebnf$1$subexpression$1$ebnf$1$subexpression$1", "symbols": ["EbArguments$macrocall$4", "EbArguments$macrocall$3"]},
    {"name": "EbArguments$macrocall$1$ebnf$1$subexpression$1$ebnf$1", "symbols": ["EbArguments$macrocall$1$ebnf$1$subexpression$1$ebnf$1", "EbArguments$macrocall$1$ebnf$1$subexpression$1$ebnf$1$subexpression$1"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "EbArguments$macrocall$1$ebnf$1$subexpression$1", "symbols": ["EbArguments$macrocall$3", "EbArguments$macrocall$1$ebnf$1$subexpression$1$ebnf$1", "_"]},
    {"name": "EbArguments$macrocall$1$ebnf$1", "symbols": ["EbArguments$macrocall$1$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "EbArguments$macrocall$1$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "EbArguments$macrocall$1", "symbols": ["EbArguments$macrocall$2", "_", "EbArguments$macrocall$1$ebnf$1", "EbArguments$macrocall$5"], "postprocess": p.ListProcessor},
    {"name": "EbArguments", "symbols": ["EbArguments$macrocall$1"]},
    {"name": "EbArgument", "symbols": ["Expr"]},
    {"name": "EbArgument", "symbols": ["Identifier", "_", {"literal":":"}, "_", "Expr"]},
    {"name": "Atom", "symbols": ["ExprConstruct"]},
    {"name": "ExprCall", "symbols": ["EcTarget", "EcArguments"]},
    {"name": "EcTarget$ebnf$1", "symbols": ["CompileTime"], "postprocess": id},
    {"name": "EcTarget$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "EcTarget", "symbols": ["Atom", "EcTarget$ebnf$1"]},
    {"name": "EcArguments$macrocall$2", "symbols": [{"literal":"("}]},
    {"name": "EcArguments$macrocall$3", "symbols": ["EcArgument"]},
    {"name": "EcArguments$macrocall$4", "symbols": ["COMMA"]},
    {"name": "EcArguments$macrocall$5", "symbols": [{"literal":")"}]},
    {"name": "EcArguments$macrocall$1$ebnf$1$subexpression$1$ebnf$1", "symbols": []},
    {"name": "EcArguments$macrocall$1$ebnf$1$subexpression$1$ebnf$1$subexpression$1", "symbols": ["EcArguments$macrocall$4", "EcArguments$macrocall$3"]},
    {"name": "EcArguments$macrocall$1$ebnf$1$subexpression$1$ebnf$1", "symbols": ["EcArguments$macrocall$1$ebnf$1$subexpression$1$ebnf$1", "EcArguments$macrocall$1$ebnf$1$subexpression$1$ebnf$1$subexpression$1"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "EcArguments$macrocall$1$ebnf$1$subexpression$1", "symbols": ["EcArguments$macrocall$3", "EcArguments$macrocall$1$ebnf$1$subexpression$1$ebnf$1", "_"]},
    {"name": "EcArguments$macrocall$1$ebnf$1", "symbols": ["EcArguments$macrocall$1$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "EcArguments$macrocall$1$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "EcArguments$macrocall$1", "symbols": ["EcArguments$macrocall$2", "_", "EcArguments$macrocall$1$ebnf$1", "EcArguments$macrocall$5"], "postprocess": p.ListProcessor},
    {"name": "EcArguments", "symbols": ["EcArguments$macrocall$1"]},
    {"name": "EcArgument", "symbols": ["Expr"]},
    {"name": "EcArgument", "symbols": ["Identifier", "_", {"literal":":"}, "_", "Expr"]},
    {"name": "Stmt", "symbols": ["ExprCall"]},
    {"name": "Atom", "symbols": ["ExprCall"]},
    {"name": "ExprMacroCall$ebnf$1", "symbols": ["EmArgument"], "postprocess": id},
    {"name": "ExprMacroCall$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "ExprMacroCall", "symbols": ["EmTarget", "ExprMacroCall$ebnf$1"]},
    {"name": "EmTarget", "symbols": ["Atom", "CompileTime"]},
    {"name": "EmArgument", "symbols": ["__", "Expr"]},
    {"name": "Stmt", "symbols": ["ExprMacroCall"]},
    {"name": "BinaryExpr", "symbols": ["ExprMacroCall"]},
    {"name": "ExprIndexBracket", "symbols": ["EbTarget", "EbIndex"]},
    {"name": "EbTarget", "symbols": ["Atom"]},
    {"name": "EbIndex$macrocall$2", "symbols": [{"literal":"["}]},
    {"name": "EbIndex$macrocall$3", "symbols": ["Expr"]},
    {"name": "EbIndex$macrocall$4", "symbols": ["COMMA"]},
    {"name": "EbIndex$macrocall$5", "symbols": [{"literal":"]"}]},
    {"name": "EbIndex$macrocall$1$subexpression$1$ebnf$1", "symbols": []},
    {"name": "EbIndex$macrocall$1$subexpression$1$ebnf$1$subexpression$1", "symbols": ["EbIndex$macrocall$4", "EbIndex$macrocall$3"]},
    {"name": "EbIndex$macrocall$1$subexpression$1$ebnf$1", "symbols": ["EbIndex$macrocall$1$subexpression$1$ebnf$1", "EbIndex$macrocall$1$subexpression$1$ebnf$1$subexpression$1"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "EbIndex$macrocall$1$subexpression$1", "symbols": ["EbIndex$macrocall$3", "EbIndex$macrocall$1$subexpression$1$ebnf$1", "_"]},
    {"name": "EbIndex$macrocall$1", "symbols": ["EbIndex$macrocall$2", "_", "EbIndex$macrocall$1$subexpression$1", "EbIndex$macrocall$5"], "postprocess": p.ListProcessor},
    {"name": "EbIndex", "symbols": ["EbIndex$macrocall$1"]},
    {"name": "Atom", "symbols": ["ExprIndexBracket"]},
    {"name": "ExprIndexDot", "symbols": ["EdTarget", "EdOperator", "EdName"]},
    {"name": "EdTarget", "symbols": ["Atom"]},
    {"name": "EdOperator", "symbols": ["_", {"literal":"."}, "_"]},
    {"name": "EdName", "symbols": ["Identifier"]},
    {"name": "Atom", "symbols": ["ExprIndexDot"]},
    {"name": "StmtForEach", "symbols": ["SfKeyword", "SfCondition", "SfBody"]},
    {"name": "SfKeyword$ebnf$1", "symbols": ["CompileTime"], "postprocess": id},
    {"name": "SfKeyword$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "SfKeyword", "symbols": [{"literal":"for"}, "SfKeyword$ebnf$1", "_"]},
    {"name": "SfCondition", "symbols": [{"literal":"("}, "_", "Identifier", "__", {"literal":"in"}, "__", "Expr", "_", {"literal":")"}, "_"]},
    {"name": "SfBody$macrocall$2", "symbols": ["Stmt"]},
    {"name": "SfBody$macrocall$1$ebnf$1", "symbols": []},
    {"name": "SfBody$macrocall$1$ebnf$1$subexpression$1", "symbols": ["StmtSep", "Stmt"]},
    {"name": "SfBody$macrocall$1$ebnf$1", "symbols": ["SfBody$macrocall$1$ebnf$1", "SfBody$macrocall$1$ebnf$1$subexpression$1"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "SfBody$macrocall$1", "symbols": [{"literal":"{"}, "SfBody$macrocall$1$ebnf$1", "StmtSep", {"literal":"}"}]},
    {"name": "SfBody", "symbols": ["SfBody$macrocall$1"]},
    {"name": "Stmt", "symbols": ["StmtForEach"]},
    {"name": "StmtWhile", "symbols": ["SwKeyword", "SwCondition", "SwBody"]},
    {"name": "SwKeyword$ebnf$1", "symbols": ["CompileTime"], "postprocess": id},
    {"name": "SwKeyword$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "SwKeyword", "symbols": [{"literal":"while"}, "SwKeyword$ebnf$1", "_"]},
    {"name": "SwCondition", "symbols": [{"literal":"("}, "_", "Expr", "_", {"literal":")"}, "_"]},
    {"name": "SwBody$macrocall$2", "symbols": ["Stmt"]},
    {"name": "SwBody$macrocall$1$ebnf$1", "symbols": []},
    {"name": "SwBody$macrocall$1$ebnf$1$subexpression$1", "symbols": ["StmtSep", "Stmt"]},
    {"name": "SwBody$macrocall$1$ebnf$1", "symbols": ["SwBody$macrocall$1$ebnf$1", "SwBody$macrocall$1$ebnf$1$subexpression$1"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "SwBody$macrocall$1", "symbols": [{"literal":"{"}, "SwBody$macrocall$1$ebnf$1", "StmtSep", {"literal":"}"}]},
    {"name": "SwBody", "symbols": ["SwBody$macrocall$1"]},
    {"name": "Stmt", "symbols": ["StmtWhile"]},
    {"name": "StmtIf$ebnf$1", "symbols": []},
    {"name": "StmtIf$ebnf$1", "symbols": ["StmtIf$ebnf$1", "SiElif"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "StmtIf$ebnf$2", "symbols": ["SiElse"], "postprocess": id},
    {"name": "StmtIf$ebnf$2", "symbols": [], "postprocess": () => null},
    {"name": "StmtIf", "symbols": ["SiKeyword", "SiCondition", "SiBody", "StmtIf$ebnf$1", "StmtIf$ebnf$2"]},
    {"name": "SiKeyword$ebnf$1", "symbols": ["CompileTime"], "postprocess": id},
    {"name": "SiKeyword$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "SiKeyword", "symbols": [{"literal":"if"}, "SiKeyword$ebnf$1", "_"]},
    {"name": "SiElifKeyword", "symbols": ["_", {"literal":"else"}, "__", {"literal":"if"}, "_"]},
    {"name": "SiElseKeyword", "symbols": ["_", {"literal":"else"}, "_"]},
    {"name": "SiCondition", "symbols": [{"literal":"("}, "_", "Expr", "_", {"literal":")"}, "_"]},
    {"name": "SiBody$macrocall$2", "symbols": ["Stmt"]},
    {"name": "SiBody$macrocall$1$ebnf$1", "symbols": []},
    {"name": "SiBody$macrocall$1$ebnf$1$subexpression$1", "symbols": ["StmtSep", "Stmt"]},
    {"name": "SiBody$macrocall$1$ebnf$1", "symbols": ["SiBody$macrocall$1$ebnf$1", "SiBody$macrocall$1$ebnf$1$subexpression$1"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "SiBody$macrocall$1", "symbols": [{"literal":"{"}, "SiBody$macrocall$1$ebnf$1", "StmtSep", {"literal":"}"}]},
    {"name": "SiBody", "symbols": ["SiBody$macrocall$1"]},
    {"name": "SiElif", "symbols": ["SiElifKeyword", "SiCondition", "SiBody"]},
    {"name": "SiElse", "symbols": ["SiElseKeyword", "SiCondition", "SiBody"]},
    {"name": "Stmt", "symbols": ["StmtIf"]},
    {"name": "StmtMatch", "symbols": ["SmKeyword", "SmValue", "SmCases"]},
    {"name": "SmKeyword$ebnf$1", "symbols": ["CompileTime"], "postprocess": id},
    {"name": "SmKeyword$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "SmKeyword", "symbols": [{"literal":"match"}, "SmKeyword$ebnf$1", "_"]},
    {"name": "SmValue", "symbols": [{"literal":"("}, "_", "Expr", "_", {"literal":")"}, "_"]},
    {"name": "SmCases$macrocall$2", "symbols": ["SmCase"]},
    {"name": "SmCases$macrocall$1$ebnf$1", "symbols": []},
    {"name": "SmCases$macrocall$1$ebnf$1$subexpression$1", "symbols": ["StmtSep", "Stmt"]},
    {"name": "SmCases$macrocall$1$ebnf$1", "symbols": ["SmCases$macrocall$1$ebnf$1", "SmCases$macrocall$1$ebnf$1$subexpression$1"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "SmCases$macrocall$1", "symbols": [{"literal":"{"}, "SmCases$macrocall$1$ebnf$1", "StmtSep", {"literal":"}"}]},
    {"name": "SmCases", "symbols": ["SmCases$macrocall$1"]},
    {"name": "SmCase", "symbols": [{"literal":"case"}, "__", "Pattern", "_", {"literal":":"}, "_", "SmBody"]},
    {"name": "SmBody$macrocall$2", "symbols": ["Stmt"]},
    {"name": "SmBody$macrocall$1$ebnf$1", "symbols": []},
    {"name": "SmBody$macrocall$1$ebnf$1$subexpression$1", "symbols": ["StmtSep", "Stmt"]},
    {"name": "SmBody$macrocall$1$ebnf$1", "symbols": ["SmBody$macrocall$1$ebnf$1", "SmBody$macrocall$1$ebnf$1$subexpression$1"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "SmBody$macrocall$1", "symbols": [{"literal":"{"}, "SmBody$macrocall$1$ebnf$1", "StmtSep", {"literal":"}"}]},
    {"name": "SmBody", "symbols": ["SmBody$macrocall$1"]},
    {"name": "Stmt", "symbols": ["StmtMatch"]},
    {"name": "ExprIf", "symbols": ["EiKeyword", "EiCondition", {"literal":"?"}, "EiTrue", {"literal":":"}, "EiFalse"]},
    {"name": "EiKeyword$ebnf$1", "symbols": ["CompileTime"], "postprocess": id},
    {"name": "EiKeyword$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "EiKeyword", "symbols": [{"literal":"if"}, "EiKeyword$ebnf$1", "__"]},
    {"name": "EiCondition", "symbols": ["Atom", "__"]},
    {"name": "EiTrue", "symbols": ["__", "Atom", "__"]},
    {"name": "EiFalse", "symbols": ["__", "Atom"]},
    {"name": "StmtReturn$ebnf$1", "symbols": ["SrValue"], "postprocess": id},
    {"name": "StmtReturn$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "StmtReturn", "symbols": ["SrKeyword", "StmtReturn$ebnf$1"]},
    {"name": "SrKeyword", "symbols": [{"literal":"return"}]},
    {"name": "SrValue", "symbols": ["WS", "Expr"]},
    {"name": "Stmt", "symbols": ["StmtReturn"]},
    {"name": "Type", "symbols": ["Expr"]},
    {"name": "Atom", "symbols": ["Identifier", "GenericArguments"]},
    {"name": "GenericArguments$macrocall$2", "symbols": [{"literal":"<"}]},
    {"name": "GenericArguments$macrocall$3", "symbols": ["GenericArgument"]},
    {"name": "GenericArguments$macrocall$4", "symbols": ["COMMA"]},
    {"name": "GenericArguments$macrocall$5", "symbols": [{"literal":">"}]},
    {"name": "GenericArguments$macrocall$1$subexpression$1$ebnf$1", "symbols": []},
    {"name": "GenericArguments$macrocall$1$subexpression$1$ebnf$1$subexpression$1", "symbols": ["GenericArguments$macrocall$4", "GenericArguments$macrocall$3"]},
    {"name": "GenericArguments$macrocall$1$subexpression$1$ebnf$1", "symbols": ["GenericArguments$macrocall$1$subexpression$1$ebnf$1", "GenericArguments$macrocall$1$subexpression$1$ebnf$1$subexpression$1"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "GenericArguments$macrocall$1$subexpression$1", "symbols": ["GenericArguments$macrocall$3", "GenericArguments$macrocall$1$subexpression$1$ebnf$1", "_"]},
    {"name": "GenericArguments$macrocall$1", "symbols": ["GenericArguments$macrocall$2", "_", "GenericArguments$macrocall$1$subexpression$1", "GenericArguments$macrocall$5"], "postprocess": p.ListProcessor},
    {"name": "GenericArguments", "symbols": ["GenericArguments$macrocall$1"]},
    {"name": "GenericArgument", "symbols": ["Type"]},
    {"name": "GenericArgument", "symbols": ["Identifier", "_", {"literal":":"}, "_", "Type"]},
    {"name": "Pattern", "symbols": ["PdCrlMembers"]},
    {"name": "Pattern", "symbols": ["Identifier", "PdCrlMembers"]},
    {"name": "Pattern", "symbols": ["PdSqrMembers"]},
    {"name": "Pattern$ebnf$1", "symbols": ["PdKeyword"], "postprocess": id},
    {"name": "Pattern$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "Pattern", "symbols": ["Pattern$ebnf$1", "Identifier"]},
    {"name": "PdCrlMembers$macrocall$2", "symbols": [{"literal":"{"}]},
    {"name": "PdCrlMembers$macrocall$3", "symbols": ["PdMember"]},
    {"name": "PdCrlMembers$macrocall$4", "symbols": ["COMMA"]},
    {"name": "PdCrlMembers$macrocall$5", "symbols": [{"literal":"}"}]},
    {"name": "PdCrlMembers$macrocall$1$subexpression$1$ebnf$1", "symbols": []},
    {"name": "PdCrlMembers$macrocall$1$subexpression$1$ebnf$1$subexpression$1", "symbols": ["PdCrlMembers$macrocall$4", "PdCrlMembers$macrocall$3"]},
    {"name": "PdCrlMembers$macrocall$1$subexpression$1$ebnf$1", "symbols": ["PdCrlMembers$macrocall$1$subexpression$1$ebnf$1", "PdCrlMembers$macrocall$1$subexpression$1$ebnf$1$subexpression$1"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "PdCrlMembers$macrocall$1$subexpression$1", "symbols": ["PdCrlMembers$macrocall$3", "PdCrlMembers$macrocall$1$subexpression$1$ebnf$1", "_"]},
    {"name": "PdCrlMembers$macrocall$1", "symbols": ["PdCrlMembers$macrocall$2", "_", "PdCrlMembers$macrocall$1$subexpression$1", "PdCrlMembers$macrocall$5"], "postprocess": p.ListProcessor},
    {"name": "PdCrlMembers", "symbols": ["PdCrlMembers$macrocall$1"]},
    {"name": "PdSqrMembers$macrocall$2", "symbols": [{"literal":"["}]},
    {"name": "PdSqrMembers$macrocall$3", "symbols": ["PdMember"]},
    {"name": "PdSqrMembers$macrocall$4", "symbols": ["COMMA"]},
    {"name": "PdSqrMembers$macrocall$5", "symbols": [{"literal":"]"}]},
    {"name": "PdSqrMembers$macrocall$1$subexpression$1$ebnf$1", "symbols": []},
    {"name": "PdSqrMembers$macrocall$1$subexpression$1$ebnf$1$subexpression$1", "symbols": ["PdSqrMembers$macrocall$4", "PdSqrMembers$macrocall$3"]},
    {"name": "PdSqrMembers$macrocall$1$subexpression$1$ebnf$1", "symbols": ["PdSqrMembers$macrocall$1$subexpression$1$ebnf$1", "PdSqrMembers$macrocall$1$subexpression$1$ebnf$1$subexpression$1"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "PdSqrMembers$macrocall$1$subexpression$1", "symbols": ["PdSqrMembers$macrocall$3", "PdSqrMembers$macrocall$1$subexpression$1$ebnf$1", "_"]},
    {"name": "PdSqrMembers$macrocall$1", "symbols": ["PdSqrMembers$macrocall$2", "_", "PdSqrMembers$macrocall$1$subexpression$1", "PdSqrMembers$macrocall$5"], "postprocess": p.ListProcessor},
    {"name": "PdSqrMembers", "symbols": ["PdSqrMembers$macrocall$1"]},
    {"name": "PdMember", "symbols": ["Pattern"]},
    {"name": "PdMember", "symbols": ["Identifier", "PdRebind", "Pattern"]},
    {"name": "PdKeyword", "symbols": [{"literal":"own"}, "__"]},
    {"name": "PdKeyword", "symbols": [{"literal":"mut"}, "__"]},
    {"name": "PdKeyword", "symbols": [{"literal":"val"}, "__"]},
    {"name": "PdRebind", "symbols": ["_", {"literal":"="}, {"literal":">"}, "_"]},
    {"name": "Attribute", "symbols": [{"literal":"#"}, "Identifier"]},
    {"name": "CompileTime", "symbols": [{"literal":"!"}]},
    {"name": "Identifier", "symbols": [(lexer.has("identifier") ? {type: "identifier"} : identifier)]},
    {"name": "__$ebnf$1", "symbols": ["newline"]},
    {"name": "__$ebnf$1", "symbols": ["__$ebnf$1", "newline"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "__", "symbols": ["__$ebnf$1"]},
    {"name": "_$ebnf$1", "symbols": []},
    {"name": "_$ebnf$1", "symbols": ["_$ebnf$1", "newline"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "_", "symbols": ["_$ebnf$1"]},
    {"name": "WS$ebnf$1", "symbols": ["whitespace"]},
    {"name": "WS$ebnf$1", "symbols": ["WS$ebnf$1", "whitespace"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "WS", "symbols": ["WS$ebnf$1"]},
    {"name": "NL$ebnf$1", "symbols": ["WS"], "postprocess": id},
    {"name": "NL$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "NL", "symbols": ["NL$ebnf$1", (lexer.has("newline") ? {type: "newline"} : newline)]},
    {"name": "whitespace", "symbols": [(lexer.has("comment") ? {type: "comment"} : comment)]},
    {"name": "whitespace", "symbols": [(lexer.has("ws") ? {type: "ws"} : ws)]},
    {"name": "newline", "symbols": [(lexer.has("comment") ? {type: "comment"} : comment)]},
    {"name": "newline", "symbols": [(lexer.has("ws") ? {type: "ws"} : ws)]},
    {"name": "newline", "symbols": [(lexer.has("newline") ? {type: "newline"} : newline)]},
    {"name": "COMMA", "symbols": [(lexer.has("comma") ? {type: "comma"} : comma)]},
    {"name": "COMMA$ebnf$1", "symbols": ["NL"]},
    {"name": "COMMA$ebnf$1", "symbols": ["COMMA$ebnf$1", "NL"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "COMMA$ebnf$2", "symbols": ["WS"], "postprocess": id},
    {"name": "COMMA$ebnf$2", "symbols": [], "postprocess": () => null},
    {"name": "COMMA", "symbols": ["COMMA$ebnf$1", "COMMA$ebnf$2"]},
    {"name": "StmtSep$ebnf$1", "symbols": []},
    {"name": "StmtSep$ebnf$1$subexpression$1$ebnf$1", "symbols": []},
    {"name": "StmtSep$ebnf$1$subexpression$1$ebnf$1$subexpression$1", "symbols": [(lexer.has("comment") ? {type: "comment"} : comment)]},
    {"name": "StmtSep$ebnf$1$subexpression$1$ebnf$1$subexpression$1", "symbols": [(lexer.has("ws") ? {type: "ws"} : ws)]},
    {"name": "StmtSep$ebnf$1$subexpression$1$ebnf$1", "symbols": ["StmtSep$ebnf$1$subexpression$1$ebnf$1", "StmtSep$ebnf$1$subexpression$1$ebnf$1$subexpression$1"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "StmtSep$ebnf$1$subexpression$1", "symbols": ["StmtSep$ebnf$1$subexpression$1$ebnf$1", (lexer.has("newline") ? {type: "newline"} : newline)]},
    {"name": "StmtSep$ebnf$1", "symbols": ["StmtSep$ebnf$1", "StmtSep$ebnf$1$subexpression$1"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "StmtSep", "symbols": ["StmtSep$ebnf$1"]},
    {"name": "StmtSep$subexpression$1$ebnf$1", "symbols": []},
    {"name": "StmtSep$subexpression$1$ebnf$1$subexpression$1", "symbols": [(lexer.has("comment") ? {type: "comment"} : comment)]},
    {"name": "StmtSep$subexpression$1$ebnf$1$subexpression$1", "symbols": [(lexer.has("ws") ? {type: "ws"} : ws)]},
    {"name": "StmtSep$subexpression$1$ebnf$1", "symbols": ["StmtSep$subexpression$1$ebnf$1", "StmtSep$subexpression$1$ebnf$1$subexpression$1"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "StmtSep$subexpression$1$ebnf$2", "symbols": []},
    {"name": "StmtSep$subexpression$1$ebnf$2$subexpression$1", "symbols": [(lexer.has("comment") ? {type: "comment"} : comment)]},
    {"name": "StmtSep$subexpression$1$ebnf$2$subexpression$1", "symbols": [(lexer.has("ws") ? {type: "ws"} : ws)]},
    {"name": "StmtSep$subexpression$1$ebnf$2", "symbols": ["StmtSep$subexpression$1$ebnf$2", "StmtSep$subexpression$1$ebnf$2$subexpression$1"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "StmtSep$subexpression$1", "symbols": ["StmtSep$subexpression$1$ebnf$1", {"literal":";"}, "StmtSep$subexpression$1$ebnf$2"]},
    {"name": "StmtSep", "symbols": ["StmtSep$subexpression$1"]}
  ],
  ParserStart: "main",
};

export default grammar;
