import { Ctx } from '../ast/context'
import * as Nodes from '../ast/nodes'
import { VariableFlags } from '../ast/nodes'
import { ANY, CONFIG, LIST, OPT, REP, SEQ, Syntax, TOKEN } from '../parser-generator'

const $ = CONFIG<Ctx>()

const UNDEFINED = () => undefined as any

export const Grammar = new Syntax('Root', $.array(Nodes.LocalRef))
Grammar.match(() => LIST(OPT(N), Stmt, ExpressionSeparator), r => r.value.elements)

function add(parameters: {context: Ctx, value: Nodes.Node}) {
    return parameters.context.add(parameters.value)
}

// ============================== Core grammar components ==============================
// An atom is part of the language that can be used in a binary expression without needing to be wrapped in parentheses
const Atom = new Syntax('Atom', $<Nodes.LocalRef>())
Atom.match(() => Literal)
// ----
Atom.match(() => Call, add)
Atom.match(() => Construct, add)
Atom.match(() => Get, add)
Atom.match(() => Parenthesized)

// An expression is part of the language that can be evaluated in a context expecting a value
const Expr = new Syntax('Expr', $<Nodes.LocalRef>())
Expr.match(() => Binary)
Expr.match(() => ControlFlow, add)
Expr.match(() => Definition, add)
Expr.match(() => Jumps, add)
// ----
Expr.match(() => Copy, add)
Expr.match(() => Generic, add)
Expr.match(() => Move, add)
Expr.match(() => Not, add)
//Expr.match(() => Set, add)

// A statement is part of the language that can be evaluated standalone
const Stmt = new Syntax('Stmt', $<Nodes.LocalRef>())
Stmt.match(() => ControlFlow, add)
Stmt.match(() => Definition, add)
Stmt.match(() => Jumps, add)
// ----
Stmt.match(() => AttributeBlock, add)
Stmt.match(() => Call, add)
Stmt.match(() => Destroy, add)
Stmt.match(() => Set, add)

// ============================== Definition ==============================
const Definition = new Syntax('Definition', $(Nodes.Node))
Definition.match(() => Alias)
Definition.match(() => Case)
Definition.match(() => Enum)
Definition.match(() => Error)
Definition.match(() => Function)
Definition.match(() => Struct)
Definition.match(() => Trait)
Definition.match(() => Type)
Definition.match(() => Variable)

// == Alias
const Alias = new Syntax('Alias', $.undefined)
Alias.match({
    definition: () => SEQ('alias', _, Expr),
    transform: UNDEFINED,
})

// === Case
const Case = new Syntax('Case', $.undefined)
Case.match({
    definition: () => SEQ('case', _, Symbol),
    transform: UNDEFINED,
})

// === Enum
const Enum = new Syntax('Enum', $(Nodes.Enum))
Enum.match({
    definition: () => SEQ('enum', OPT(_, Symbol), OPT(GenericDefinition), OPT(Implements), OPT(Attributes), OPT(Body)),
    transform: r => new Nodes.Enum(r.Symbol ?? '<unnamed>', r.Body),
})

// === Error
const Error = new Syntax('Error', $.undefined)
Error.match({
    definition: () => SEQ('error', _, Symbol),
    transform: UNDEFINED,
})

// === Function
const Function = new Syntax('Function', $(Nodes.Function))
Function.match({
    definition: () => SEQ('fn', OPT(_, Symbol), Parameters, OPT(ReturnType), OPT(GenericDefinition), OPT(Attributes), OPT(Body)),
    transform: r => new Nodes.Function(r.Symbol, r.ReturnType as any, r.Parameters, r.Body),
})

// === Struct
const Struct = new Syntax('Struct', $(Nodes.Struct))
Struct.match({
    definition: () => SEQ('struct', OPT(_, Symbol), OPT(GenericDefinition), OPT(Implements), OPT(Attributes), OPT(Body)),
    transform: r => new Nodes.Struct(r.Symbol ?? '<unnamed>', r.Body),
})

// === Trait
const Trait = new Syntax('Trait', $(Nodes.Trait))
Trait.match({
    definition: () => SEQ('trait', OPT(_, Symbol), OPT(GenericDefinition), OPT(Implements), OPT(Attributes), OPT(Body)),
    transform: r => new Nodes.Trait(r.Symbol ?? '<unnamed>', r.Body),
})

// === Type
const Type = new Syntax('Type', $.undefined)
Type.match({
    definition: () => SEQ('type', _, Symbol, OPT(VariableValue)),
    transform: UNDEFINED,
})

// === Variable
const Variable = new Syntax('Variable', $(Nodes.Variable))
Type.match({
    definition: () => SEQ(VariableKeyword, Symbol, OPT(VariableType), OPT(Attributes), OPT(VariableValue)),
    transform: r => new Nodes.Variable(r.Symbol, r.VariableType as any, r.VariableKeyword ?? VariableFlags.None),
})

// ============================== ControlFlow ==============================
const ControlFlow = new Syntax('ControlFlow', $(Nodes.Node))
ControlFlow.match(() => ForEach)
ControlFlow.match(() => If)
ControlFlow.match(() => Match)
ControlFlow.match(() => While)

// === ForEach
const ForEach = new Syntax('ForEach', $(Nodes.ForEach))
ForEach.match({
    definition: () => SEQ('for', OPT(_, Label), _, Destructure, _, 'in', _, Expr, Body),
    transform: r => new Nodes.ForEach(r.Destructure, r.Expr, r.Body),
})

// === If
const If = new Syntax('If', $(Nodes.If))
If.match({
    definition: () => SEQ('if', OPT(_, Label), _, Condition, Body, OPT(REP(IfElif)), OPT(IfElse)),
    transform: r => new Nodes.If([
        new Nodes.IfCase(r.Condition, r.Body),
        ... (r.IfElif ?? []),
        ... (r.IfElse ? [r.IfElse] : []),
    ]),
})

const IfElif = new Syntax('IfElif', $(Nodes.IfCase))
IfElif.match({
    definition: () => SEQ(OPT(N), 'else', _, 'if', _, Condition, Body),
    transform: r => new Nodes.IfCase(r.Condition, r.Body),
})

const IfElse = new Syntax('IfElse', $(Nodes.IfCase))
IfElse.match({
    definition: () => SEQ(OPT(N), 'else', Body),
    transform: r => new Nodes.IfCase(null, r.Body),
})

// === Match
const Match = new Syntax('Match', $(Nodes.Match))
Match.match({
    definition: () => SEQ('match', OPT(_, Label), _, Expr, OPT(N), MatchCases),
    transform: r => new Nodes.Match(r.Expr, r.MatchCases),
})

const MatchCase = new Syntax('MatchCase', $(Nodes.MatchCase))
MatchCase.match({
    definition: () => SEQ('case', _, Destructure, Body),
    transform: r => new Nodes.MatchCase(r.Destructure, r.Body),
})

const MatchCases = new Syntax('MatchCases', $.array(Nodes.MatchCase))
MatchCases.match({
    definition: () => LIST('{', OPT(N), MatchCase, ExpressionSeparator, '}'),
    transform: r => r.value.elements,
})

// == While
const While = new Syntax('While', $(Nodes.While))
While.match({
    definition: () => SEQ('while', OPT(_, Label), _, Condition, Body),
    transform: r => new Nodes.While(r.Condition, r.Body),
})

// ============================== Jumps ==============================
const Jumps = new Syntax('Jumps', $(Nodes.Node))
Jumps.match(() => Break)
Jumps.match(() => Continue)
Jumps.match(() => Return)

// == Break
const Break = new Syntax('Break', $(Nodes.Break))
Break.match({
    definition: () => SEQ('break', OPT(_, Label), OPT(_, Expr)),
    transform: r => new Nodes.Break(r.Label, r.Expr),
})

// == Continue
const Continue = new Syntax('Continue', $(Nodes.Continue))
Continue.match({
    definition: () => SEQ('continue', OPT(_, Label)),
    transform: r => new Nodes.Continue(r.Label),
})

// == Return
const Return = new Syntax('Return', $(Nodes.Return))
Return.match({
    definition: () => SEQ('return', OPT(_, Label), OPT(_, Expr)),
    transform: r => new Nodes.Return(r.Expr),
})

// ============================== Other Expressions ==============================
// == Attributes (for scope)
const AttributeBlock = new Syntax('AttributeBlock', $(Nodes.BlockAttribute))
AttributeBlock.match({
    definition: () => SEQ('##', FullSymbol),
    transform: UNDEFINED,
})

// == Call
const Call = new Syntax('Call', $(Nodes.Call))
Call.match({
    definition: () => SEQ(Atom, LIST('(', OPT(N), Argument, ArgumentSeparator, ')')),
    transform: r => new Nodes.Call(r.Atom as any, r.value[1].elements),
})

// == Construct
const Construct = new Syntax('Construct', $(Nodes.Construct))
Construct.match({
    definition: () => SEQ(Atom, LIST('{', OPT(N), Argument, ArgumentSeparator, '}')),
    transform: r => new Nodes.Construct(r.Atom, r.value[1].elements),
})

// == Copy
const Copy = new Syntax('Copy', $.undefined)
Copy.match({
    definition: () => SEQ('copy', _, Expr),
    transform: UNDEFINED,
})

// == Destroy
const Destroy = new Syntax('Destroy', $.undefined)
Destroy.match({
    definition: () => SEQ('destroy', _, Expr),
    transform: UNDEFINED,
})

// == Generic use
const Generic = new Syntax('Generic', $.undefined)
Generic.match({
    definition: () => SEQ(Atom, LIST('[', OPT(N), Argument, ArgumentSeparator, ']')),
    transform: UNDEFINED,
})

// == Get
// TODO: Could probably cause ambiguity with prefix (Test it)
const Get = new Syntax('Get', $(Nodes.Get))
Get.match({
    definition: () => SEQ(FullSymbol),
    transform: r => new Nodes.Get(r.FullSymbol),
})

// == Move
const Move = new Syntax('Move', $(Nodes.Move))
Move.match({
    definition: () => SEQ('move', _, Expr),
    transform: r => new Nodes.Move(r.Expr),
})

// == Not
const Not = new Syntax('Not', $.undefined)
Not.match({
    definition: () => SEQ('not', _, Expr),
    transform: UNDEFINED,
})

// == Parenthesized Expression
const Parenthesized = new Syntax('Parenthesized', $.undefined)
Parenthesized.match({
    definition: () => SEQ('(', OPT(N), Expr, OPT(N), ')'),
    transform: r => r.Expr,
})

// == Set
const Set = new Syntax('Set', $(Nodes.Set))
Set.match({
    definition: () => SEQ(FullSymbol, _, '=', _, Expr),
    transform: r => new Nodes.Set(r.FullSymbol, r.Expr),
})

// ============================== Binary and Unary Expressions ==============================
// Expressions in Fang are grouped into four "precedence levels"
//  1. Logical operators (i.e. and / or)
//  2. Any binary operator, with spaces around the operator (e.g. 1 + 2 or foo == bar)
//  3. Any unary operator (e.g. foo* or ++bar)
//  4. Any binary operator, without spaces around the operator (e.g. 1+2 or foo==bar)
// Therefore "1+2 * ++3 and 4" is parsed as "((1+2) * (++3)) and 4"
//
// Within a precedence level, operators are always parsed left to right.

// == Transformers
const call = (name: (v: any[]) => string, args: (v: any[]) => any[]) =>
    (r: { context: Ctx, value: any[] }) =>
        r.context.add(new Nodes.Call(new Nodes.RefByName(null, name(r.value)), args(r.value)))

const TRANSFORM_SPACED  = call(r => `infix${r[2]}`, r => [r[0], r[4]])
const TRANSFORM_COMPACT = call(r => `infix${r[1]}`, r => [r[0], r[2]])
const TRANSFORM_PREFIX  = call(r => `prefix${r[0]}`, r => [r[0]])
const TRANSFORM_POSTFIX = call(r => `postfix${r[1]}`, r => [r[0]])

// == Expressions
const Binary = new Syntax('Binary', $(Nodes.LocalRef))
Binary.match(() => SEQ(Binary, _, Logic, _, Spaced), TRANSFORM_SPACED)
Binary.match(() => SEQ(Binary, L, Logic, _, Spaced), TRANSFORM_SPACED)
Binary.match(() => SEQ(Binary, _, Logic, L, Spaced), TRANSFORM_SPACED)
Binary.match(() => Spaced)

const Spaced = new Syntax('Spaced', $(Nodes.LocalRef))
Spaced.match(() => SEQ(Spaced, _, Operator, _, Unary), TRANSFORM_SPACED)
Spaced.match(() => SEQ(Spaced, L, Operator, _, Unary), TRANSFORM_SPACED)
Spaced.match(() => SEQ(Spaced, _, Operator, L, Unary), TRANSFORM_SPACED)
Spaced.match(() => Unary)

const Unary = new Syntax('Unary', $(Nodes.LocalRef))
Unary.match(() => SEQ(Operator, Atom), TRANSFORM_PREFIX)
Unary.match(() => SEQ(Atom, Operator), TRANSFORM_POSTFIX)
Unary.match(() => Compact)

const Compact = new Syntax('Compact', $(Nodes.LocalRef))
Compact.match(() => SEQ(Compact, Operator, Atom), TRANSFORM_COMPACT)
Compact.match(() => Atom)

// == Operators
const Logic = new Syntax('Logic', $<string>())
Logic.match(() => ANY('and', 'or'))

const Operator = new Syntax('Operator', $<string>())
Operator.match(() => /[~!@#$%^&*+=|?/:\-\\<>]+/)
Operator.match(() => '..')

// ============================== Literals ==============================
const Literal = new Syntax('Literal', $.undefined)
Literal.match(() => LiteralFloat)
Literal.match(() => LiteralInteger)
Literal.match(() => LiteralString)

function TRANSFORM_INTEGER(offset: number, base: number) {
    return (r: { context: Ctx, value: string }) => {
        const value = r.value.slice(offset).replace(/_/g, '')
        return r.context.add(new Nodes.Constant(r.context.builtins.u32, parseInt(value, base)))
    }
}

// Note: The order of float and literal integers as specified in the grammar is important
//  The parser generator will generate a tokenizer that matches in the order of the tokens in the grammar.
//  This means that if the regular integer rule is before the hexadecimal integer rule then
//  0x1000 will get tokenized as "0" "x" "1000" instead of "0x1000"

// == Literal Float
const LiteralFloat = new Syntax('LiteralFloat', $(Nodes.Constant))
LiteralFloat.match(() => /[0-9]+.[0-9]+(?:[eE][+-]?[1-9]+)?/, UNDEFINED)

// == Literal Integer
const LiteralInteger = new Syntax('LiteralInteger', $(Nodes.Constant))
LiteralInteger.match(() => /0x[0-9a-fA-F_]+/,   TRANSFORM_INTEGER(2, 16))
LiteralInteger.match(() => /0o[0-7_]+/,         TRANSFORM_INTEGER(2, 8))
LiteralInteger.match(() => /0b[0-7_]+/,         TRANSFORM_INTEGER(2, 2))
LiteralInteger.match(() => /[0-9_]+/,           TRANSFORM_INTEGER(0, 10))

// == Literal String
const LiteralString = new Syntax('LiteralString', $(Nodes.Constant))
LiteralString.match(() => SEQ('\'', StringContent, '\''), UNDEFINED)
LiteralString.match(() => SEQ('\'', StringContent, REP(StringInterpolation, StringContent), '\''), UNDEFINED)

// String interpolation relies heavily on stateful tokenization (see tokenizer configuration)
const StringContent = new Syntax('StringContent', $<string | null>())
StringContent.match(() => OPT(TOKEN('STRING_CONTENT')))

const StringInterpolation = new Syntax('StringInterpolation', $(Nodes.Constant))
StringInterpolation.match(() => SEQ('${', Expr, '}'), UNDEFINED)

// ============================== Primitives used in larger expressions ==============================
// == Argument
const Argument = new Syntax('Argument', $.undefined)
Argument.match(() => Expr)
Argument.match(() => SEQ(Identifier, ':', OPT(_), Expr))

// == Attributes
const Attributes = new Syntax('Attributes', $.undefined)
Attributes.match(() => REP(N, Attribute))

const Attribute = new Syntax('Attribute', $.undefined)
Attribute.match(() => SEQ('#', FullSymbol))

// == Body
// Explicitly use a Block?
const Body = new Syntax('Body', $.undefined)
Body.match({
    definition: () => SEQ(OPT(N), LIST('{', OPT(N), Stmt, ExpressionSeparator, '}')),
    transform: r => r.value[1].elements
})

Body.match({
    definition: () => SEQ(OPT(N), '=>', OPT(_), Expr),
    transform: UNDEFINED,
})

// == Generic definition
const GenericDefinition = new Syntax('Generic', $.undefined)
GenericDefinition.match(() => SEQ(N, 'generic', GenericParameters))

const GenericParameters = new Syntax('GenericParameters', $.undefined)
GenericParameters.match(() => LIST('[', OPT(N), GenericParameter, ArgumentSeparator, ']'))

const GenericParameter = new Syntax('GenericParameter', $.undefined)
GenericParameter.match(() => Identifier)

// == Identifiers, Names, and Symbols
const Identifier = new Syntax('Identifier', $<string>())
Identifier.match(() => /[_a-zA-Z][_a-zA-Z0-9]*/)

const Symbol = new Syntax('Symbol', $<string>())
//Symbol.match(() => SEQ('${', OPT(N), Expr, OPT(N), '}'))
Symbol.match(() => Identifier)
Symbol.match(() => SEQ('infix', Operator), r => r.value.join(''))
Symbol.match(() => SEQ('prefix', Operator), r => r.value.join(''))
Symbol.match(() => SEQ('postfix', Operator), r => r.value.join(''))

const FullSymbol = new Syntax('FullSymbol', $<Nodes.Ref<any>>())
FullSymbol.match(() => Symbol, r => new Nodes.RefByName(null, r.value))
FullSymbol.match(() => Index)

// == Indexing
const Index = new Syntax('Index', $<Nodes.Ref>())
Index.match({
    definition: () => SEQ(Indexable, Dot, Symbol),
    transform: UNDEFINED,
})

const Indexable = new Syntax('Indexable', $.undefined)
Indexable.match(() => Index)
Indexable.match(() => Symbol)
Indexable.match(() => Call)
Indexable.match(() => Construct)
Indexable.match(() => SEQ(Atom, Operator))

const Dot = new Syntax('Dot', $.undefined)
Dot.match(() => '.')
Dot.match(() => SEQ('.', L))
Dot.match(() => SEQ(L, '.'))

// == Implements statements
const Implements = new Syntax('Implements', $.undefined)
Implements.match(() => REP(N, 'impl', _, Expr))

// == Labels
const Label = new Syntax('Label', $.undefined)
Label.match(() => SEQ('@', Identifier))

// Other primitives
const ReturnType = new Syntax('ReturnType', $(Nodes.LocalRef))
ReturnType.match(() => SEQ(OPT(_), '->', OPT(_), Expr), UNDEFINED)

const Parameters = new Syntax('Parameters', $.undefined)
Parameters.match({
    definition: () => LIST('(', OPT(N), Parameter, ArgumentSeparator, ')'),
    transform: r => r.value.elements,
})

const Parameter = new Syntax('Parameter', $.undefined)
Parameter.match(() => SEQ(Symbol, VariableType, OPT(VariableValue)), UNDEFINED)
Parameter.match(() => SEQ(VariableKeyword, Symbol, OPT(VariableValue)), UNDEFINED)
Parameter.match(() => SEQ(Binary), UNDEFINED)

const VariableKeyword = new Syntax('VariableKeyword', $<VariableFlags>())
VariableKeyword.match(() => SEQ('val', _), r  => VariableFlags.None)
VariableKeyword.match(() => SEQ('mut', _), r  => VariableFlags.Mutable)
VariableKeyword.match(() => SEQ('own', _), r  => VariableFlags.Owns)

const VariableType = new Syntax('VariableType', $.undefined)
VariableType.match(() => SEQ(OPT(_), ':', OPT(_), Expr))

const VariableValue = new Syntax('VariableValue', $.undefined)
VariableValue.match(() => SEQ(OPT(_), '=', OPT(_), Expr))

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
const Destructure = new Syntax('Destructure', $.undefined)

Destructure.match(() => Expr)
Destructure.match(() => LIST('{', OPT(N), Destructure, ArgumentSeparator, '}'))

const Condition = new Syntax('Condition', $.undefined)
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