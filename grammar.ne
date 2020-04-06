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

df              -> dfKeyword dfName dfParameters dfReturnType:? dfBody:? {% p.Function %}
dfKeyword       -> "fn" __
dfName          -> %identifier _
dfParameters    -> STAR["(", dfParameter, COMMA, ")"]           {% p.STAR %}
dfParameter     -> declare_function_parameter
dfReturnType    -> _ ":" _ type
dfBody          -> _ dfBodyList
dfBodyList      -> BODY[stmt] {% p.STAR %}

## Declare/Function/Parameter ######################################################################
declare_function_parameter -> dfp

dfp             -> dfpKeyword:* %identifier _ ":" _ type
dfp             -> dfpKeyword:* type
dfpKeyword      -> "own" __
dfpKeyword      -> "mut" __

## Declare/Trait ###################################################################################
declare_trait -> dt

stmt -> declare_trait

dt              -> dtKeyword dtName dtImplements:* dtBody:? {% p.Trait %}
dtKeyword       -> "trait" __
dtKeyword       -> "class" __
dtName          -> %identifier
dtImplements    -> __ "impl" __ type
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

## Expression/Index ################################################################################
expression_index -> eiTarget eiIndex

eiTarget        -> atom
eiIndex         -> PLUS["[", expr, COMMA, "]"] {% p.PLUS %}
# Work around to fix editor syntax highlighting ==> "[]

atom            -> expression_index

## Expression/Member ###############################################################################
expression_member -> emTarget emSymbol emName

emTarget        -> atom
emSymbol        -> _ "." _
emName          -> %identifier

atom            -> expression_member

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
type            -> tAtom tLifetime:? {% p.type %}

tAtom           -> %identifier
tLifetime       -> _ %lifetime

## Type/Generic ####################################################################################
type_generic    -> tgTarget tgParameters

atom            -> type_generic

tgTarget        -> tAtom
tgParameters    -> STAR["<", tgParameter, COMMA, ">"]
tgParameter     -> type