@{%
import lexer from './lexer';
import * as p from './post';
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

dfp             -> dfpKeyword:* %identifier _ ":" _ type
dfp             -> dfpKeyword:* type
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
unaryOp         -> %operator (%operator | ">" | "<"):*

binaryExpr        -> unaryExpr __ binaryOp __ unaryExpr
binaryExpr        -> unaryExpr unaryOp unaryExpr
binaryExpr        -> unaryExpr
unaryExpr         -> unaryOp atom
unaryExpr         -> atom unaryOp
unaryExpr         -> atom

atom            -> %identifier
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
expression_index_dot -> eidTarget eidSymbol eidName

eidTarget       -> atom
eidSymbol       -> _ "." _
eidName         -> %identifier

atom            -> expression_index_dot

## Literal/Integer #################################################################################
literal_integer -> %integer_bin
literal_integer -> %integer_oct
literal_integer -> %integer_dec
literal_integer -> %integer_hex

atom -> literal_integer

## Literal/String ##################################################################################
literal_string -> %string_double_quote

atom -> literal_string

## Type ############################################################################################
type            -> tExpr tLifetime:? {% p.type %}

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