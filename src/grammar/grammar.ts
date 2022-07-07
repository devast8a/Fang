import { make } from '../ast/builder-helpers'
import { Context } from '../ast/context'
import * as Nodes from '../ast/nodes'
import { RefId } from '../ast/nodes'
import { list, either, opt, Rules, seq, Builder, star } from './generator'

const { rule, def } = Rules<Context>()

// ------------------------------------------------------------------------------------------------
// Define these at the top of the file because they are used commonly throughout the file.

// == Core Rules ==
const Atom = rule<RefId>()  // Simple expression, no spaces, unless delimited. eg. "(a + b)" is ok
const Expr = rule<RefId>()  // Any expression.
const Type = rule<RefId>()  // A type expression.

Type.add(Expr)

export const FangGrammar = rule(
    () => def(N_, list(Expr, Semicolon), N_),
    (ctx, s1, list, s2) => list.build(ctx).elements
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

function infer() {
    return new Nodes.RefInfer();
}

// ------------------------------------------------------------------------------------------------
// == Body ==
const Body = rule(
    star('{', N_, Expr, Semicolon, '}'),
    (ctx, list) => list.build(ctx).elements,
)

// == Block Attributes ==
Expr.add(
    def('##', Atom),
    (ctx, keyword, target) =>
        ctx.add(new Nodes.BlockAttribute(ctx.scope, target.build(ctx)))
)

// == Break ==
Expr.add(
    def('break'),
    (ctx, keyword) =>
        ctx.add(new Nodes.Break(ctx.scope, null, null))
)

// == Call ==
const Symbol = rule<Nodes.Ref>();
Symbol.add(Identifier, (ctx, name) => new Nodes.RefName(name))

const Arguments = star('(', N_, Expr, Comma, ')').elements
Atom.add(
    def(Symbol, Arguments),
    (ctx, target, args) => make(Nodes.Call, ctx, target, args)
)

// == Construct ==
{
    Expr.add(
        () => def(Atom, Arguments),
        (ctx, target, args) =>
            ctx.add(new Nodes.Construct(ctx.scope, target.build(ctx), args.build(ctx).elements))
    )

    const Arguments = star('{', N_, Expr, Comma, '}')
}

// == Continue ==
Expr.add(
    def('continue'),
    (ctx, keyword) =>
        ctx.add(new Nodes.Continue(ctx.scope, null, null))
)

// == Enum ==
Expr.add(
    def('enum', __, Identifier, N_, Body),
    (ctx, keyword, s1, name, s2, body) =>
        ctx.add(children => new Nodes.Enum(ctx.scope, children.scope, name, body.build(ctx)))
)

// == For Each ==
Expr.add(
    def('for', __, Identifier, __, 'in', __, Expr, N_, Body),
    (ctx, ...args) => {
        const name = args[2];
        const collection = args[6].build(ctx);
        const body = args[8].build(ctx);

        const variable = ctx.add(new Nodes.Variable(ctx.scope, name, infer()));
        return ctx.add(new Nodes.ForEach(ctx.scope, variable, collection, body))
    }
)

// == Function ==
Expr.add(
    () => {
        const keyword    = 'fn'
        const name       = seq(__, Identifier)
        const parameters = star('(', _, Parameter, Comma, ')').elements
        const returnType = seq(_, '->', _, Type)
        const body = either([
            seq(N_, Body),
            seq(_, '=>', N_, Expr),
        ])

        return def(keyword, opt(name), parameters, opt(returnType), opt(body))
    }, (ctx, keyword, name, parameters, returnType, body) =>
        ctx.add(children => new Nodes.Function(ctx.scope, children.scope, name?.[1] ?? null, infer(), parameters.build(ctx), []))
)
const Parameter = rule(() => {
    const keyword = either([
        seq('own', __),
        seq('mut', __),
    ]);
    const name = Identifier;
    const type = seq(_, ':', _, Type)
    const value = seq(_, '=', _, Expr)

    return def(opt(keyword), name, opt(type), opt(value))
}, (ctx, keyword, name, type, value) => {
    return ctx.add(new Nodes.Variable(ctx.scope, name, infer()))
})

// == Get ==
Atom.add(
    def(Symbol),
    (ctx, ref) => make(Nodes.Get, ctx, ref)
)

// == If ==
{
    const Elif = list(seq(N_, 'else', __, 'if', N_, Body));
    const Else = seq(N_, 'else', N_, Body)

    Expr.add(
        def('if', __, Expr, N_, Body, opt(Elif), opt(Else)),
        (ctx, keyword, s1, condition, s2, body, x, y) =>
            ctx.add(new Nodes.If(ctx.scope, []))
    )
}

// == Index Bracket ==
Symbol.add(
    def(Atom, '[', Expr, ']'),
    (ctx, target, left, field, right) => new Nodes.RefFieldName(target.build(ctx), field.build(ctx) as any)
)

// == Index Dot ==
const Dot = either([
    '.',
    seq('.', NL),
    seq(NL, '.'),
])

Symbol.add(
    def(Atom, Dot, Identifier),
    (ctx, target, op, field) => new Nodes.RefFieldName(target.build(ctx), field)
)

// == Literal Integer ==
{
    const processor = (offset: number, base: number) =>
        (ctx: Context, number: string) =>
            ctx.add(new Nodes.Constant(
                ctx.scope,
                new Nodes.RefName('u32'),
                parseInt(number.replace(/_/g, '').slice(offset), base)
            ))

    Atom.add(/0x[0-9a-fA-F_]+/, processor(2, 16))
    Atom.add(/0o[0-7_]+/,       processor(2, 8))
    Atom.add(/0b[0-1_]+/,       processor(2, 2))
    Atom.add(/[0-9_]+/,         processor(0, 10))
}

// == Literal List ==
Atom.add(
    star('[', N_, Expr, Comma, ']').elements,
    (ctx, values) => make(Nodes.Constant, ctx, infer(), values.build(ctx))
)

// == Move ==
Expr.add(
    def('move', __, Expr),
    (ctx, keyword, s1, value) => make(Nodes.Move, ctx, value)
)

// == Operators ==
{
    const Operator = /[~!@#$%^&*+=|?/:.\-\\<>]+/
    const Logical  = rule<RefId>() // x or y
    const Spaced   = rule<RefId>() // x + y
    const Unary    = rule<RefId>() // x++
    const Compact  = rule<RefId>() // x+y

    const B = (ctx: Context, left: Builder<RefId, Context>, ls: any, op: string, rs: any, right: Builder<RefId, Context>) =>
        ctx.add(new Nodes.Call(
            ctx.scope,
            new Nodes.RefName(`infix${op}`),
            [left.build(ctx), right.build(ctx)]
        ))

    const U = (ctx: Context, type: string, op: string, value: Builder<RefId, Context>) =>
        ctx.add(new Nodes.Call(
            ctx.scope,
            new Nodes.RefName(type + op),
            [value.build(ctx)]
        ))

    Expr.add(Logical)

    // x or y
    Logical.add(def(Logical, __, "or", __, Spaced), B)
    Logical.add(def(Logical, __, "and", __, Spaced), B)
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
}

// == Parentheses ==
Atom.add(
    def('(', _, Expr, _, ')'),
    (ctx, ...match) => match[2].build(ctx)
)

// == Return ==
Expr.add(def('return'), (ctx, kw) => make(Nodes.Return, ctx, null))
Expr.add(def('return', __, Expr), (ctx, kw, s1, value) => make(Nodes.Return, ctx, value))

// == Set ==
Expr.add(
    def(Symbol, _, '=', _, Expr),
    (ctx, target, s1, op, s2, value) => make(Nodes.Set, ctx, target, value)
)

// == Struct ==
Expr.add(
    () => {
        const keyword = 'struct'
        const name = seq(__, Identifier)
        const body = seq(N_, Body)

        return def(keyword, name, opt(body))
    },
    (ctx, keyword, name, body) =>
        ctx.add(children => new Nodes.Struct(ctx.scope, children.scope, name[1], body.build(ctx)?.[1] ?? []))
)

// == Trait ==
Expr.add(
    () => {
        const keyword = 'trait'
        const name = seq(__, Identifier)
        const body = seq(N_, Body)

        return def(keyword, name, opt(body))
    },
    (ctx, keyword, name, body) =>
        ctx.add(children => new Nodes.Trait(ctx.scope, children.scope, name[1], body.build(ctx)?.[1] ?? []))
)

// == Variable ==
const Variable = rule(() => {
    const keyword = either([
        seq('val', __),
        seq('mut', __),
    ]);
    const name = Identifier;
    const type = seq(_, ':', _, Type)
    const value = seq(_, '=', _, Expr)

    return def(keyword, name, opt(type), opt(value))
}, (ctx, keyword, name, type, value) => {
    const id = ctx.add(new Nodes.Variable(ctx.scope, name, infer()))

    const v = value.build(ctx)
    if (v !== null) {
        return ctx.add(new Nodes.Set(ctx.scope, id, v[3]))
    }

    return id;
})
Expr.add(Variable)

// == While ==
Expr.add(
    def('while', __, Expr, N_, Body),
    (ctx, keyword, s1, condition, s2, body) =>
        ctx.add(new Nodes.While(ctx.scope, condition.build(ctx), body.build(ctx)))
)