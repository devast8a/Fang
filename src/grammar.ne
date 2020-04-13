@{%
import lex from './lexer';
import * as p from './post';

// Subvert type system
const lexer = lex as any;
%}

@preprocessor typescript
@lexer lexer

STARX[ELEMENT, SEPARATOR] -> ($ELEMENT ($SEPARATOR $ELEMENT):*):?
PLUSX[ELEMENT, SEPARATOR] -> $ELEMENT ($SEPARATOR $ELEMENT):*

STAR[BEGIN, ELEMENT, SEPARATOR, END] -> $BEGIN _ ($ELEMENT ($SEPARATOR $ELEMENT):* _):? $END
PLUS[BEGIN, ELEMENT, SEPARATOR, END] -> $BEGIN _ $ELEMENT ($SEPARATOR $ELEMENT):* _ $END

BODY[ELEMENT] -> STAR["{", $ELEMENT, __, "}"]

main -> (_ stmt):* _ {% function(data){ return [].concat(...data[0]); } %}

__              -> whitespace:+ {% p.whitespace %}
_               -> whitespace:* {% p.whitespace %}

whitespace      -> %comment
whitespace      -> %ws
whitespace      -> %newline

COMMA           -> _ "," _

## Declare/Extension ###############################################################################
#declare_extension -> de
#
#stmt -> declare_extension
#
#de              -> deKeyword dt {% p.declare_extension %}
#deKeyword       -> "extend" __

## Declare/Function ################################################################################
declare_function -> df

stmt -> declare_function

df              -> dfKeyword dfName dfParameters dfReturnType:? dfGeneric:? dfBody:? {% p.Function %}
dfKeyword       -> "fn" __
dfName          -> %identifier _
dfParameters    -> STAR["(", dfParameter, COMMA, ")"]           {% p.STAR %}
dfParameter     -> declare_function_parameter
dfReturnType    -> _ ":" _ type
dfGeneric       -> _ declare_generic
dfBody          -> _ dfBodyList
dfBodyList      -> BODY[stmt] {% p.STAR %}

## Declare/Function/Parameter ######################################################################
declare_function_parameter -> dfp

dfp             -> dfpKeyword:* %identifier _ ":" _ type {% p.parameterNameType %}
dfp             -> dfpKeyword:* type                     {% p.parameterType %}     
dfpKeyword      -> "own" __
dfpKeyword      -> "mut" __

## Declare/Generic #################################################################################
declare_generic -> dgKeyword dgParameters dgWhere:*

dgKeyword       -> "generic"
dgParameters    -> PLUS["<", dgParameter, COMMA, ">"] {% p.PLUS %}
dgParameter     -> %identifier
dgWhere         -> _ "where" __ dgWhereQuery
dgWhereQuery    -> %identifier __ "is" __ type

## Declare/Trait ###################################################################################
declare_trait -> dt

stmt -> declare_trait

dt              -> dtKeyword dtName dtImplements:* dtGeneric:? dtBody:? {% p.Trait %}
dtKeyword       -> "trait" __
dtKeyword       -> "class" __
dtName          -> %identifier
dtImplements    -> __ "impl" __ type
dtGeneric       -> __ declare_generic
dtBody          -> _ dtBodyList
dtBodyList      -> BODY[stmt] {% p.STAR %}

## Declare/Variable ################################################################################
declare_variable -> dv

stmt -> declare_variable

dv              -> dvKeyword dvName dvType:? dvValue:? {% p.Variable %}
dvKeyword       -> "mut" __
dvKeyword       -> "val" __
dvName          -> %identifier
dvType          -> _ ":" _ type
dvValue         -> _ "=" binaryOp:? _ expr


## Expression ######################################################################################
expr            -> binaryExpr

# In order to avoid any potential ambiguity between generics and less than or greater than operators
# We do not consider "<" and ">" by themselves as an operator token. However we do however want to
# use these symbols for less than and greater than operators, so we special case it.
binaryOp        -> (%operator | ">" | "<"):+
unaryOp         -> %operator (%operator | ">" | "<"):* {% function(node, location, reject){if(node[0].value === "."){return reject} return node;} %}

binaryExpr        -> unaryExpr __ binaryOp __ unaryExpr     {% p.ExOpInfix %}
binaryExpr        -> unaryExpr unaryOp unaryExpr            {% p.ExOpInfix %}
binaryExpr        -> unaryExpr
unaryExpr         -> unaryOp atom                           {% p.ExOpPrefix %}
unaryExpr         -> atom unaryOp                           {% p.ExOpPostfix %}
unaryExpr         -> atom

atom            -> %identifier                              {% p.ExVariable %}
atom            -> "(" expr ")"

## Expression/Call #################################################################################
expression_call -> ecallTarget ecallArguments {% p.ExCall %}

stmt            -> expression_call
atom            -> expression_call

ecallTarget     -> atom
ecallArguments  -> STAR["(", expr, COMMA, ")"] {% p.STAR %}

## Expression/Construct ############################################################################
expression_construct -> atom econArguments {% p.ExConstruct %}

stmt            -> expression_construct
atom            -> expression_construct

econArguments   -> STAR["{", econArgument, COMMA, "}"] {% p.STAR %}
econArgument    -> expr
econArgument    -> %identifier _ ":" _ expr

## Expression/IndexBracket #########################################################################
expression_index_bracket -> eibTarget eibIndex

eibTarget       -> atom
eibIndex        -> PLUS["[", expr, COMMA, "]"] {% p.PLUS %}
# Work around to fix editor syntax highlighting ==> "[]

atom            -> expression_index_bracket

## Expression/IndexDot #############################################################################
expression_index_dot -> eidTarget eidSymbol eidName {% p.ExprIndexDot %}

eidTarget       -> atom
eidSymbol       -> _ "." _
eidName         -> %identifier

atom            -> expression_index_dot

## Expression/IndexDot #############################################################################
expression_return -> erKeyword erValue:? {% p.ExReturn %}

erKeyword       -> "return"
erValue         -> __ expr

stmt -> expression_return

## Literal/Integer #################################################################################
literal_integer -> %integer_bin {% p.LiteralInteger %}
literal_integer -> %integer_oct {% p.LiteralInteger %}
literal_integer -> %integer_dec {% p.LiteralInteger %}
literal_integer -> %integer_hex {% p.LiteralInteger %}

atom -> literal_integer

## Literal/String ##################################################################################
literal_string -> %string_double_quote {% p.LiteralString %}

atom -> literal_string

## Statement/Assign ################################################################################
StmtAssign -> saAssignable saOperator saValue {% p.StmtAssign %}

saAssignable    -> %identifier
saAssignable    -> expression_index_dot
saAssignable    -> expression_index_bracket
saOperator      -> __ binaryOp __
saValue         -> expr

stmt -> StmtAssign

## Type ############################################################################################
type            -> tExpr tLifetime:?

tExpr           -> tAtom
tAtom           -> %identifier
tLifetime       -> _ %lifetime

## Type/IndexDot ###################################################################################
type_index_dot  -> tExpr tidSymbol tidName

tidSymbol       -> _ "." _
tidName         -> %identifier

tExpr           -> type_index_dot

## Type/Generic ####################################################################################
type_generic    -> tgTarget tgParameters

tgTarget        -> tExpr
tgParameters    -> STAR["<", tgParameter, COMMA, ">"]
tgParameter     -> type

tExpr           -> type_generic