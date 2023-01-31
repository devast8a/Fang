import { Ctx } from '../ast/context'
import * as Nodes from '../ast/nodes'
import { ANY, CONFIG, LIST, OPT, REP, SEQ, Syntax, TOKEN } from '../parser-generator'

type Node = Nodes.LocalRef
const Node = Nodes.LocalRef

const UNDEF = () => undefined as any
const $ = CONFIG<Ctx>()

export const Grammar = new Syntax('Root', $.any)
Grammar.match(() => LIST(OPT(N), Stmt, ExpressionSeparator))

function add(parameters: {context: Ctx, value: Nodes.Node}) {
    return parameters.context.add(parameters.value)
}

// ============================== Core grammar components ==============================
// An atom is part of the language that can be used in a binary expression without needing to be wrapped in parentheses
const Atom = new Syntax('Atom', $(Node))
Atom.match(() => Literal)
// ----
Atom.match(() => Call, add)
Atom.match(() => Construct, add)
Atom.match(() => Get, add)
Atom.match(() => Parenthesized)

// An expression is part of the language that can be evaluated and returns a value
const Expr = new Syntax('Expr', $(Node))
Expr.match(() => Binary)
Expr.match(() => ControlFlow, add)
Expr.match(() => Definition, add)
Expr.match(() => Jumps, add)
// ----
Expr.match(() => Copy, add)
Expr.match(() => Generic, add)
Expr.match(() => Move, add)
Expr.match(() => Not, add)
Expr.match(() => Set, add)

// A statement is part of the language that can be evaluated standalone
const Stmt = new Syntax('Stmt', $(Node))
Stmt.match(() => ControlFlow)
Stmt.match(() => Definition)
Stmt.match(() => Jumps)
// ----
Stmt.match(() => Alias)
Stmt.match(() => AttributeBlock, add)
Stmt.match(() => Call, add)
Stmt.match(() => Set, add)

// ============================== Definition ==============================
const Definition = new Syntax('Definition', $.any)
Definition.match(() => Case)
Definition.match(() => Enum)
Definition.match(() => Error)
Definition.match(() => Function)
Definition.match(() => Struct)
Definition.match(() => Trait)
Definition.match(() => Type)
Definition.match(() => Variable)

// == Case
const Case = new Syntax('Case', $.any)
Case.match(() => SEQ('case', _, Identifier))

// == Enum
const Enum = new Syntax('Enum', $(Nodes.Enum))
Enum.match(() => SEQ('enum', OPT(_, Symbol), OPT(GenericDefinition), OPT(Implements), OPT(Attributes), OPT(Body)),
    r => new Nodes.Enum(r.Symbol, r.Body))

// == Error
const Error = new Syntax('Error', $(Nodes.Break))
Error.match(() => SEQ('error', _, Symbol), UNDEF)

// == Function
const Function = new Syntax('Function', $(Nodes.Function))
Function.match(() => SEQ('fn', OPT(_, Symbol), Parameters, OPT(ReturnType), OPT(GenericDefinition), OPT(Attributes), OPT(Body)), UNDEF)

const ReturnType = new Syntax('ReturnType', $(Nodes.LocalRef))
ReturnType.match(() => SEQ(OPT(_), '->', OPT(_), Expr), UNDEF)

const Parameters = new Syntax('Parameters', $(Nodes.Variable))
Parameters.match(() => LIST('(', OPT(N), Parameter, ArgumentSeparator, ')'), UNDEF)

const Parameter = new Syntax('Parameter', $(Nodes.Variable))
Parameter.match(() => SEQ(Symbol, VariableType, OPT(VariableValue)), UNDEF)
Parameter.match(() => SEQ(VariableKeyword, Symbol, OPT(VariableValue)), UNDEF)
Parameter.match(() => SEQ(Binary), UNDEF)

// == Struct
const Struct = new Syntax('Struct', $(Nodes.Struct))
Struct.match(() => SEQ('struct', OPT(_, Symbol), OPT(GenericDefinition), OPT(Implements), OPT(Attributes), OPT(Body)), UNDEF)

// == Trait
const Trait = new Syntax('Trait', $(Nodes.Trait))
Trait.match(() => SEQ('trait', OPT(_, Symbol), OPT(GenericDefinition), OPT(Implements), OPT(Attributes), OPT(Body)), UNDEF)

// == Type
const Type = new Syntax('Type', $.any)
Type.match(() => SEQ('type', _, Symbol, OPT(VariableValue)), UNDEF)

// == Variable
const Variable = new Syntax('Variable', $(Nodes.Variable))
Variable.match(() => SEQ(VariableKeyword, Symbol, OPT(VariableType), OPT(Attributes), OPT(VariableValue)), UNDEF)

const VariableKeyword = new Syntax('VariableKeyword', $.any)
VariableKeyword.match(() => SEQ('val', _))
VariableKeyword.match(() => SEQ('mut', _))
VariableKeyword.match(() => SEQ('own', _))

const VariableType = new Syntax('VariableType', $.any)
VariableType.match(() => SEQ(OPT(_), ':', OPT(_), Expr))

const VariableValue = new Syntax('VariableValue', $.any)
VariableValue.match(() => SEQ(OPT(_), '=', OPT(_), Expr))

// ============================== ControlFlow ==============================
const ControlFlow = new Syntax('ControlFlow', $.any)
ControlFlow.match(() => ForEach)
ControlFlow.match(() => If)
ControlFlow.match(() => Match)
ControlFlow.match(() => While)

// == For Each
const ForEach = new Syntax('ForEach', $(Nodes.ForEach))
ForEach.match(() => SEQ('for', OPT(_, Label), _, Destructure, _, 'in', _, Expr, Body), UNDEF)

// == If
const If = new Syntax('If', $(Nodes.If))
If.match(() => SEQ('if', OPT(_, Label), _, Condition, Body, OPT(IfElif), OPT(IfElse)), UNDEF)

const IfElif = new Syntax('IfElif', $(Nodes.If))
IfElif.match(() => REP(OPT(N), 'else', _, 'if', _, Condition, Body), UNDEF)

const IfElse = new Syntax('IfElse', $(Nodes.If))
IfElse.match(() => SEQ(OPT(N), 'else', Body), UNDEF)

// == Match
const Match = new Syntax('Match', $(Nodes.Match))
Match.match(() => SEQ('match', OPT(_, Label), _, Expr, OPT(N), MatchCases), UNDEF)

const MatchCase = new Syntax('MatchCase', $(Nodes.MatchCase))
MatchCase.match(() => SEQ('case', _, Destructure, Body), UNDEF)

const MatchCases = new Syntax('MatchCases', $(Nodes.MatchCase))
MatchCases.match(() => LIST('{', OPT(N), MatchCase, ExpressionSeparator, '}'), UNDEF)

// == While
const While = new Syntax('While', $(Nodes.While))
While.match(() => SEQ('while', OPT(_, Label), _, Condition, Body), UNDEF)

// ============================== Jumps ==============================
const Jumps = new Syntax('Jumps', $.any)
Jumps.match(() => Break)
Jumps.match(() => Continue)
Jumps.match(() => Return)

// == Break
const Break = new Syntax('Break', $(Nodes.Break))
Break.match(() => SEQ('break', OPT(_, Label), OPT(_, Expr)), UNDEF)

// == Continue
const Continue = new Syntax('Continue', $(Nodes.Continue))
Continue.match(() => SEQ('continue', OPT(_, Label)), UNDEF)

// == Return
const Return = new Syntax('Return', $(Nodes.Return))
Return.match(() => SEQ('return', OPT(_, Label), OPT(_, Expr)), UNDEF)

// ============================== Other Expressions ==============================
// == Alias
export const Alias = new Syntax('Alias', $.any)
Alias.match(() => SEQ('alias', _, Expr), UNDEF)

// == Attributes (for scope)
export const AttributeBlock = new Syntax('AttributeBlock', $(Nodes.BlockAttribute))
AttributeBlock.match(() => SEQ('##', FullSymbol), UNDEF)

// == Call
const Call = new Syntax('Call', $(Nodes.Call))
Call.match(() => SEQ(Atom, LIST('(', OPT(N), Argument, ArgumentSeparator, ')')), UNDEF)

// == Construct
const Construct = new Syntax('Construct', $(Nodes.Construct))
Construct.match(() => SEQ(Atom, LIST('{', OPT(N), Argument, ArgumentSeparator, '}')), UNDEF)

// == Move
const Copy = new Syntax('Copy', $.any)
Copy.match(() => SEQ('copy', _, Expr), UNDEF)

// == Destroy
const Destroy = new Syntax('Destruct', $(Nodes.Destruct))
Destroy.match(() => SEQ('destroy', _, Expr), UNDEF)

// == Generic use
const Generic = new Syntax('Generic', $.any)
Construct.match(() => SEQ(Atom, LIST('[', OPT(N), Argument, ArgumentSeparator, ']')), UNDEF)

// == Get
const Get = new Syntax('Get', $(Nodes.Get))
Get.match(() => FullSymbol, UNDEF)

// == Indexing
const Index = new Syntax('Index', $.any)
Index.match(() => SEQ(Indexable, Dot, Symbol))

const Dot = new Syntax('Dot', $.any)
Dot.match(() => '.')
Dot.match(() => SEQ('.', L))
Dot.match(() => SEQ(L, '.'))

const Indexable = new Syntax('Indexable', $.any)
Indexable.match(() => Index)
Indexable.match(() => Symbol)
Indexable.match(() => Call)
Indexable.match(() => Construct)
Indexable.match(() => SEQ(Atom, Operator))

// == Move
const Move = new Syntax('Move', $(Nodes.Move))
Move.match(() => SEQ('move', _, Expr), UNDEF)

// == Not
const Not = new Syntax('Not', $.any)
Not.match(() => SEQ('not', _, Expr), UNDEF)

// == Parenthesized Expression
const Parenthesized = new Syntax('Parenthesized', $(Nodes.LocalRef))
Parenthesized.match(() => SEQ('(', OPT(N), Expr, OPT(N), ')'), UNDEF)

// == Set
const Set = new Syntax('Set', $.any)
Set.match(() => SEQ(FullSymbol, _, '=', _, Expr))

// ============================== Binary and Unary Expressions ==============================
const B = (value: any) => 'BINARY!' as any
const U = (value: any) => 'UNARY!' as any

const Binary = new Syntax('Binary', $(Nodes.LocalRef))
Binary.match(() => SEQ(Binary, _, Logic, _, Spaced), B)
Binary.match(() => SEQ(Binary, L, Logic, _, Spaced), B)
Binary.match(() => SEQ(Binary, _, Logic, L, Spaced), B)
Binary.match(() => Spaced)

const Spaced = new Syntax('Spaced', $(Nodes.LocalRef))
Spaced.match(() => SEQ(Spaced, _, Operator, _, Unary), B)
Spaced.match(() => SEQ(Spaced, L, Operator, _, Unary), B)
Spaced.match(() => SEQ(Spaced, _, Operator, L, Unary), B)
Spaced.match(() => Unary)

const Unary = new Syntax('Unary', $(Nodes.LocalRef))
Unary.match(() => SEQ(Operator, Atom), U)
Unary.match(() => SEQ(Atom, Operator), U)
Unary.match(() => Compact)

const Compact = new Syntax('Compact', $(Nodes.LocalRef))
Compact.match(() => SEQ(Compact, Operator, Atom), B)
Compact.match(() => Atom)

const Logic = new Syntax('Logic', $.any)
Logic.match(() => ANY('and', 'or'))

const Operator = new Syntax('Operator', $.any)
Operator.match(() => /[~!@#$%^&*+=|?/:\-\\<>]+/)
Operator.match(() => '..')

// ============================== Literals ==============================
const Literal = new Syntax('Literal', $.any)
Literal.match(() => LiteralFloat)
Literal.match(() => LiteralInteger)
Literal.match(() => LiteralString)

// Note: The order of float and literal integers as specified in the grammar is important
//  The parser generator will generate a tokenizer that matches in the order of the tokens in the grammar.
//  This means that if the regular integer rule is before the hexadecimal integer rule then
//  0x1000 will get tokenized as "0" "x" "1000" instead of "0x1000"

// == Literal Float
const LiteralFloat = new Syntax('LiteralFloat', $(Nodes.Constant))
LiteralFloat.match(() => /[0-9]+.[0-9]+(?:[eE][+-]?[1-9]+)?/, UNDEF)

// == Literal Integer
const LiteralInteger = new Syntax('LiteralInteger', $(Nodes.Constant))
LiteralInteger.match(() => /0x[0-9a-fA-F_]+/, UNDEF)
LiteralInteger.match(() => /0o[0-7_]+/, UNDEF)
LiteralInteger.match(() => /0b[0-7_]+/, UNDEF)
LiteralInteger.match(() => /[0-9_]+/, UNDEF)

// == Literal String
const LiteralString = new Syntax('LiteralString', $(Nodes.Constant))
LiteralString.match(() => SEQ('\'', StringContent, '\''), UNDEF)
LiteralString.match(() => SEQ('\'', StringContent, REP(StringInterpolation, StringContent), '\''), UNDEF)

// String interpolation relies heavily on stateful tokenization (see tokenizer configuration)
const StringContent = new Syntax('StringContent', $<string | null>())
StringContent.match(() => OPT(TOKEN('STRING_CONTENT')))

const StringInterpolation = new Syntax('StringInterpolation', $(Nodes.Constant))
StringInterpolation.match(() => SEQ('${', Expr, '}'), UNDEF)

// ============================== Primitives used in larger expressions ==============================
// == Argument
const Argument = new Syntax('Argument', $.any)
Argument.match(() => Expr)
Argument.match(() => SEQ(Identifier, ':', OPT(_), Expr))

// == Attributes
const Attributes = new Syntax('Attributes', $.any)
Attributes.match(() => REP(N, Attribute))

const Attribute = new Syntax('Attribute', $.any)
Attribute.match(() => SEQ('#', FullSymbol))

// == Body
const Body = new Syntax('Body', $.any)
Body.match(() => SEQ(OPT(N), LIST('{', OPT(N), Stmt, ExpressionSeparator, '}')))
Body.match(() => SEQ(OPT(N), '=>', OPT(_), Expr))

// == Generic definition
const GenericDefinition = new Syntax('Generic', $.any)
GenericDefinition.match(() => SEQ(N, 'generic', GenericParameters))

const GenericParameters = new Syntax('GenericParameters', $.any)
GenericParameters.match(() => LIST('[', OPT(N), GenericParameter, ArgumentSeparator, ']'))

const GenericParameter = new Syntax('GenericParameter', $.any)
GenericParameter.match(() => Identifier)

// == Identifiers, Names, and Symbols
const Identifier = new Syntax('Identifier', $.any)
Identifier.match(() => /[_a-zA-Z][_a-zA-Z0-9]*/)

const Symbol = new Syntax('Symbol', $.any)
Symbol.match(() => SEQ('${', OPT(N), Expr, OPT(N), '}'))
Symbol.match(() => Identifier)
Symbol.match(() => SEQ('infix', Operator))
Symbol.match(() => SEQ('prefix', Operator))
Symbol.match(() => SEQ('postfix', Operator))

const FullSymbol = new Syntax('FullSymbol', $.any)
FullSymbol.match(() => Symbol)
FullSymbol.match(() => Index)

// == Implements statements
const Implements = new Syntax('Implements', $.any)
Implements.match(() => REP(N, 'impl', _, Expr))

// == Labels
const Label = new Syntax('Label', $.any)
Label.match(() => SEQ('@', Identifier))

// ============================== Whitespace ==============================
// == Whitespace
const comment  = /#+(?:[ \t]+[ -~]*)?/
const space    = /[ \t]+/
const newline  = SEQ(OPT(space), OPT(comment), '\n')
const newlines = SEQ(REP(newline), OPT(space))

// == Shortcuts for common whitespace patterns
export const _ = space                      // space
export const N = REP(ANY(_, comment, '\n')) // space, comments, or newlines
export const L = newlines                   // space, comments, or newlines (with at least one newline)

// == Separators
export const ExpressionSeparator  = ANY(newlines, SEQ(OPT(_), ';', OPT(_)))
export const ArgumentSeparator    = ANY(newlines, SEQ(OPT(_), ',', OPT(_)))

// ============================== Destructuring ==============================
const Destructure = new Syntax('Destructure', $.any)

Destructure.match(() => Expr)
Destructure.match(() => LIST('{', OPT(N), Destructure, ArgumentSeparator, '}'))

const Condition = new Syntax('Condition', $.any)
Condition.match(() => Expr)

// ============================== Tokenizer Configuration ==============================
// We do not need to specify the complete tokenizer configuration here. The parser generator collects and populates the
//  configuration with tokens used throughout the grammar. We primarily use the tokenizer configuration to setup state
//  based tokenization (see https://github.com/no-context/moo#states) to handle string interpolation.
//
// Tokens specified here are matched by the tokenizer before tokens specified in the grammar, so we also use this to fix
//  the order of tokenization for some tokens where it would be impractical to order in the grammar (e.g. "." vs "..").
$.TOKENS = {
    'main': [
        // Logic for string interpolation
        { match: '${', push: 'main' },
        { match: '{', push: 'main' },
        { match: '}', pop: 1 },
        { match: '\'', push: 'string' },

        // Explicitly set tokenization ordering for the following tokens
        { match: comment, lineBreaks: true },
        { match: '..' },
        { match: '.' },
    ],
    'string': [
        // Tokens inside of strings
        { match: '${', push: 'main' },
        { match: '\'', pop: 1 },
        { match: /\\./ },
        { match: /(?:[^$'\n]|\$[^{\n])+/, token: 'STRING_CONTENT' },
    ]
}