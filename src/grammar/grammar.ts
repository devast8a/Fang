import { Ctx } from '../ast/context'
import * as Nodes from '../ast/nodes'
import { Node, Ref, RefId, VariableFlags } from '../ast/nodes'
import { unimplemented } from '../utils'
import { list, either, opt, Rules, seq, Builder, star } from './generator'

const { rule, def } = Rules<Ctx>()

// ------------------------------------------------------------------------------------------------
// Define these at the top of the file because they are used commonly throughout the file.

// == Core Rules ==
const Atom = rule<RefId>()  // Simple expression, no spaces, unless delimited. eg. "(a + b)" is ok
const Expr = rule<RefId>()  // Any expression.
const Type = rule<Ref>()    // A type expression.
const Symbol = rule<Ref>()

Type.add(Symbol)

export const FangGrammar = rule(
    () => def(N_, list(Expr, Semicolon), N_),
    (ctx, n1, list, n3) => list.elements
)

// == Whitespace ==
const comment = /#+(?:[ \t]+[ -~]*)?/                   // Comment (Attributes complicate this)
const __  = /[ \t]+/                                    // Required space
const _   = opt(__)                                     // Optional space
const N__ = list(either([__, comment, '\n']))           // Required space, comments, or newlines
const N_  = opt(N__)                                    // Optional space, comments, or newlines
const NL  = seq(list(seq(_, opt(comment), '\n')), _)    // Required newlines

// == Separators ==
//  Newlines are allowed where ever these separators are allowed
const Semicolon = either([NL, seq(';', _)])
const Comma     = either([NL, seq(',', _)])

// == Identifier ==
const Identifier = /[_a-zA-Z][_a-zA-Z0-9]*/
Symbol.add(Identifier, (ctx, name) => new Nodes.RefName(name))

const Name = rule<string>();
Name.add(Identifier, (ctx, name) => name);

function infer() {
    return new Nodes.RefInfer();
}

function ref(name: string) {
    return new Nodes.RefName<any>(name);
}

function addNode(ctx: Ctx, node: Node) {
    return ctx.add(node);
}

// ------------------------------------------------------------------------------------------------
// == Body ==
const Body = rule(
    star('{', N_, Expr, Semicolon, '}').elements,
    (ctx, list) => list
)

const BodyX = rule<RefId[]>();
BodyX.add(seq(N_, Body).get(1));
BodyX.add(
    () => def(_, '=>', N_, Expr),
    (ctx, n1, n2, n3, body) => [ctx.add(new Nodes.Return(body))]
)

// == Block Attributes ==
const BlockAttribute = rule(
    () => def('##', Symbol),
    (ctx, n1, target) => new Nodes.BlockAttribute(target),
);

Expr.add(BlockAttribute, addNode);

// == Break ==
const Break = rule(
    () => def('break'),
    (ctx, n1) => new Nodes.Break(null, null),
);

Expr.add(Break, addNode);

// == Call ==
const Call = rule(
    () => def(Symbol, CallArguments),
    (ctx, target, args) => new Nodes.Call(target, args),
);

const CallArguments = star('(', N_, Expr, Comma, ')').elements;

Atom.add(Call, addNode);
Type.add(Call, addNode);

// == Construct ==
const Construct = rule(
    () => def(Symbol, ConstructArguments),
    (ctx, target, args) => new Nodes.Construct(target, args),
)

const ConstructArguments = star('{', N_, Expr, Comma, '}').elements;

Atom.add(Construct, addNode);

// == Continue ==
const Continue = rule(
    () => def('continue'),
    (ctx, n1) => new Nodes.Continue(null, null),
)

Expr.add(Continue, addNode);

// == Enum ==
const Enum = rule(
    () => def('enum', __, Identifier, N_, Body),
    (ctx, n1, n2, name, n4, body) => new Nodes.Enum(name, body),
)

Expr.add(Enum, addNode);

// == For Each ==
const ForEach = rule(
    () => def('for', __, Identifier, __, 'in', __, Expr, N_, Body),

    (ctx, n1, n2, name, n4, n5, n6, collection, n8, body) => {
        const variable = ctx.add(new Nodes.Variable(name, infer(), VariableFlags.None));
        
        return new Nodes.ForEach(variable, collection, body)
    }
)

Expr.add(ForEach, addNode);

// == Function ==
const Function = rule(
    () => {
        const keyword    = 'fn'
        const name       = seq(__, Name).get(1)
        const parameters = star('(', _, Parameter, Comma, ')').elements
        const returnType = seq(_, '->', _, Type).get(3)

        return def(keyword, opt(name), parameters, opt(returnType), opt(BodyX))
    },
    (ctx, keyword, name, parameters, returnType, body) =>
        new Nodes.Function(name, returnType ?? infer(), parameters, body ?? [])
)

Expr.add(Function, addNode)
Type.add(Function, addNode)

const Parameter = rule(() => {
    const keyword = either([
        seq('own', __),
        seq('mut', __),
    ]).get(0);

    const name = Identifier;
    const type = seq(_, ':', _, Type).get(3)
    const value = seq(_, '=', _, Expr)

    return def(opt(keyword), name, opt(type), opt(value))
}, (ctx, keyword, name, type, value) => {
    return ctx.add(new Nodes.Variable(name, type ?? infer(), getVariableFlags(keyword)));
})

// == Get ==
const Get = rule(
    def(Symbol),
    (ctx, ref) => new Nodes.Get(ref),
)

Atom.add(Get, addNode);

// == If ==
{
    const Elif = list(seq(N_, 'else', __, 'if', BodyX))
    const Else = seq(N_, 'else', BodyX)

    const If = rule(
        def('if', __, Expr, BodyX, opt(Elif), opt(Else)),
        (ctx, kw, s1, condition, body, x, final) => {
            const cases = [];

            // If case
            cases.push(new Nodes.IfCase(condition, body));

            // Else case
            const f = final;
            if (f !== null) {
                cases.push(new Nodes.IfCase(null, f[2]))
            }
            

            return new Nodes.If(cases);
        }
    )

    Expr.add(If, addNode);
}

// == Index Bracket ==
const IndexBracket = rule(
    def(Atom, '[', Expr, ']'),
    (ctx, target, left, field, right) =>
        new Nodes.RefFieldName(target, field as any),
);

Symbol.add(IndexBracket);

// == Index Dot ==
const IndexDot = rule(
    () => def(Atom, Dot, Name),
    (ctx, target, op, field) => new Nodes.RefFieldName(target, field)
)

Symbol.add(IndexDot);

const Dot = either([
    '.',
    seq('.', NL),
    seq(NL, '.'),
])

// == Literal Float ==
const LiteralFloat = rule(
    /[0-9_]+\.[0-9_]+/,
    (ctx, number) => new Nodes.Constant(ctx.builtins.f64, parseFloat(number.replace(/_/g, '')))
)

Atom.add(LiteralFloat, addNode);

// == Literal Integer ==
// TODO: Convert to new style
{
    const processor = (offset: number, base: number) =>
        (ctx: Ctx, number: string) =>
            ctx.add(new Nodes.Constant(
                ctx.builtins.u32,
                parseInt(number.replace(/_/g, '').slice(offset), base)
            ))

    Atom.add(/0x[0-9a-fA-F_]+/, processor(2, 16))
    Atom.add(/0o[0-7_]+/,       processor(2, 8))
    Atom.add(/0b[0-1_]+/,       processor(2, 2))
    Atom.add(/[0-9_]+/,         processor(0, 10))
}

// == Literal List ==
// TODO: Convert to new style
Atom.add(
    star('[', N_, /[0-9_]+/, Comma, ']').elements,
    (ctx, values) => ctx.add(new Nodes.Constant(infer(), values.map(number => parseInt(number))))
)

// == Literal String ==
// TODO: Convert to new style
Atom.add(
    /'(?:[^\\']+|\\['])+'/,
    (ctx, value) => {
        // Remove starting and ending '
        value = value.slice(1, -1);
        value = value.replace(/\\./, value => {
            switch (value[1]) {
                case 'n':  return '\n'
                case '\'': return '\''
                default: throw unimplemented('Escape')
            }
        })

        return ctx.add(new Nodes.Constant(ctx.builtins.str, value));
    },
)

// == Match ==
const Match = rule(
    () => def('match', __, Expr, N_, MatchCases),
    (ctx, n1, n2, value, n4, cases) => new Nodes.Match(value, cases),
)

const MatchCases = rule(
    () => star('{', N_, MatchCase, Semicolon, '}').elements,
    (ctx, list) => list,
);

const MatchCase = rule(
    def('case', __, Expr, BodyX),
    (ctx, n1, n2, value, body) => new Nodes.MatchCase(value, body),
);

Expr.add(Match, addNode);

// == Move ==
const Move = rule(
    def('move', __, Expr),
    (ctx, n1, n2, value) => new Nodes.Move(value),
)

Expr.add(Move, addNode);

// == Operators ==
{
    const Operator  = /[~!@#$%^&*+=|?/:.\-\\<>]+/
    const LogicalOp = either(['and', 'or'])
    const Logical   = rule<RefId>() // x or y
    const Spaced    = rule<RefId>() // x + y
    const Unary     = rule<RefId>() // x++
    const Compact   = rule<RefId>() // x+y

    const B = (ctx: Ctx, left: RefId, ls: any, op: string, rs: any, right: RefId) =>
        ctx.add(new Nodes.Call(ref(`infix${op}`), [left, right]))

    const U = (ctx: Ctx, type: string, op: string, value: RefId) =>
        ctx.add(new Nodes.Call(ref(type + op), [value]))

    Expr.add(Logical)

    // x and/or y
    Logical.add(def(Logical, __, LogicalOp, __, Spaced), B)
    Logical.add(def(Logical, NL, LogicalOp, __, Spaced), B)
    Logical.add(def(Logical, __, LogicalOp, NL, Spaced), B)
    Logical.add(Spaced)

    // x + y
    Spaced.add(def(Spaced, __, Operator, __, Unary), B)
    Spaced.add(def(Spaced, NL, Operator, __, Unary), B)
    Spaced.add(def(Spaced, __, Operator, NL, Unary), B)
    Spaced.add(Unary)

    // x++
    Unary.add(def(Operator, Atom), (ctx, op, value) => U(ctx, 'prefix', op, value))
    Unary.add(def(Atom, Operator), (ctx, value, op) => U(ctx, 'postfix', op, value))
    Unary.add(Compact)

    // x+y
    Compact.add(def(Compact, Operator, Atom), (ctx, left, op, right) => B(ctx, left, null, op, null, right))
    Compact.add(Atom)

    Symbol.add(def('infix',   Operator), (ctx, l, r) => new Nodes.RefName(l + r))
    Symbol.add(def('postfix', Operator), (ctx, l, r) => new Nodes.RefName(l + r))
    Symbol.add(def('prefix', Operator), (ctx, l, r) => new Nodes.RefName(l + r))
    Name.add(def('infix',   Operator), (ctx, l, r) => l + r)
    Name.add(def('postfix', Operator), (ctx, l, r) => l + r)
    Name.add(def('prefix', Operator), (ctx, l, r) => l + r)
}

// == Parentheses ==
const Parentheses = rule(
    () => seq('(', _, Expr, _, ')').get(2),
    (ctx, body) => body
)

Atom.add(Parentheses)

// == Return ==
const Return = rule<Nodes.Return>();

Return.add(
    () => def('return'),
    (ctx, n1) => new Nodes.Return(null)
);

Return.add(
    () => def('return', __, Expr),
    (ctx, n1, n2, value) => new Nodes.Return(value),
);

Expr.add(Return, addNode);

// == Set ==
const Set = rule(
    () => def(Symbol, _, '=', _, Expr),
    (ctx, target, n2, op, n4, value) => new Nodes.Set(target, value),
);

Expr.add(Set, addNode);

// == Struct ==
const Struct = rule(
    () => {
        const keyword = 'struct'
        const name = seq(__, Identifier).get(1)
        const impls = list(seq(_, 'impl', __, Expr).get(3)).get('elements')
        const body = seq(N_, Body).get(1)

        return def(keyword, name, opt(impls), opt(body))
    },
    (ctx, keyword, name, impls, body) =>
        new Nodes.Struct(name, body ?? [])
)

Expr.add(Struct, addNode)

// == Trait ==
const Trait = rule(
    () => {
        const keyword = 'trait'
        const name = seq(__, Identifier).get(1)
        const body = seq(N_, Body).get(1)

        return def(keyword, name, opt(body))
    },
    (ctx, keyword, name, body) =>
        new Nodes.Trait(name, body ?? [])
)

Expr.add(Trait, addNode);



// == Variable ==
const Variable = rule(() => {
    const keyword = either([
        seq('val', __),
        seq('mut', __),
    ]).get(0);

    const name = Identifier;
    const type = seq(_, ':', _, Type).get(3)
    const value = seq(_, '=', _, Expr)

    return def(keyword, name, opt(type), opt(value))
}, (ctx, keyword, name, type, value) => {
    const id = ctx.add(new Nodes.Variable(name, type ?? infer(), getVariableFlags(keyword)))

    const v = value
    if (v !== null) {
        return ctx.add(new Nodes.Set(id, v[3]))
    }

    return id;
}, 'variable')
Expr.add(Variable)

// == While ==
Expr.add(
    def('while', __, Expr, N_, Body),
    (ctx, keyword, s1, condition, s2, body) =>
        ctx.add(new Nodes.While(condition, body))
)

function getVariableFlags(keyword: string | null) {
    switch (keyword) {
        case null: return VariableFlags.None;
        case 'mut': return VariableFlags.Mutable;
        case 'own': return VariableFlags.Owns;
        case 'val': return VariableFlags.None;
        default: throw unimplemented(keyword);
    }
}