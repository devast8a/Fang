@{%
const p = require("./post");
const moo = require("moo");

const lexer = moo.compile({
  comment:      /#[ -Z\\-~][ -~]*/,
  ws:           /[ \t]+/,
  identifier:   /[a-zA-Z_][a-zA-Z0-9_]*/,
  operator:     /[\-+]/,
  newline:      {match: '\n', lineBreaks: true},

  left_round:   '(',
  right_round:  ')',
  left_square:  '[',
  right_square: ']',
  left_curly:   '{',
  right_curly:  '}',
  left_angle:   '<',
  right_angle:  '>',
  comma:        ',',
  colon:        ':',
  lifetime:     /%[a-zA-Z_][a-zA-Z0-9_]*/,

  attribute_begin:  '#[',
});
%}
@lexer lexer

STARX[ELEMENT, SEPARATOR] -> ($ELEMENT ($SEPARATOR $ELEMENT):*):?
PLUSX[ELEMENT, SEPARATOR] -> $ELEMENT ($SEPARATOR $ELEMENT):*

STAR[BEGIN, ELEMENT, SEPARATOR, END] -> $BEGIN _ ($ELEMENT ($SEPARATOR $ELEMENT):* _):? $END
PLUS[BEGIN, ELEMENT, SEPARATOR, END] -> $BEGIN _ $ELEMENT ($SEPARATOR $ELEMENT):* _ $END

BODY[ELEMENT] -> "{" _ ($ELEMENT (__ $ELEMENT):* _):? "}"

main -> (_ stmt):* _ {% function(data){ return [].concat(...data[0]); } %}

__              -> whitespace:+ {% p.whitespace %}
_               -> whitespace:* {% p.whitespace %}

whitespace      -> %comment
whitespace      -> %ws
whitespace      -> %newline

COMMA           -> _ "," _

## Declare/Extension ###############################################################################
declare_extension -> de

stmt -> declare_extension

de              -> deKeyword dt {% p.declare_extension %}
deKeyword       -> "extend" __

## Declare/Function ################################################################################
declare_function -> df

stmt -> declare_function

df              -> dfKeyword dfName dfParameters dfReturnType:? dfBody:? {% p.declare_function %}
dfKeyword       -> "fn" __
dfName          -> %identifier _
dfParameters    -> STAR["(", dfParameter, COMMA, ")"]           {% p.STAR %}
dfParameter     -> declare_function_parameter
dfReturnType    -> _ ":" _ type
dfBody          -> _ BODY[stmt]

## Declare/Function/Parameter ######################################################################
declare_function_parameter -> dfp

dfp             -> dfpKeyword:* %identifier _ ":" _ type {% p.parameter(1, 5) %}
dfp             -> dfpKeyword:* type {% p.parameter(null, 1) %}
dfpKeyword      -> "own" __
dfpKeyword      -> "mut" __

## Declare/Trait ###################################################################################
declare_trait -> dt

stmt -> declare_trait

dt              -> dtKeyword dtName dtImplements:* dtBody:? {% p.declare_trait %}
dtKeyword       -> "trait" __
dtKeyword       -> "class" __
dtName          -> %identifier
dtImplements    -> __ "impl" __ type
dtBody          -> _ BODY[stmt]

## Expression ######################################################################################
expr            -> atom

atom            -> %identifier

## Expression/Call #################################################################################
expression_call -> atom ecallArguments {% p.expression_call %}

stmt            -> expression_call
atom            -> expression_call

ecallArguments  -> STAR["(", expr, COMMA, ")"] {% p.STAR %}

## Expression/Construct ############################################################################
expression_construct -> atom econArguments {% p.expression_construct %}

stmt            -> expression_construct
atom            -> expression_construct

econArguments   -> STAR["{", expr, COMMA, "}"] {% p.STAR %}

## Type ############################################################################################
type            -> t_atom t_lifetime:? {% p.type %}

t_atom          -> %identifier
t_atom          -> "{" %identifier ":" _ type "}"

t_lifetime      -> _ %lifetime