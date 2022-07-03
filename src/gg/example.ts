import { unimplemented } from '../utils';
import { either, opt, Rules, seq } from './index';

const { rule, def } = Rules<null>();
                                //  ^^ defines the type of 'context'
                                //  unused here but useful for maintaining context when parsing things.

export const Number = rule<number>('Number');

Number.add(() => def(/0x[0-9a-fA-F]+/), (ctx, number) => parseInt(number.slice(2), 16));
Number.add(() => def(/0b[0-1]+/), (ctx, number) => parseInt(number.slice(2), 2));
Number.add(() => def(/[0-9]+/), (ctx, number) => parseInt(number));

export const Operator = seq(opt(/[ \t]+/), either(['-', '+']), opt(/[ \t]+/));

export const BinaryExpression = rule('BinaryExpression',
    // definition matches all items left to right
    () => def(Expr, Operator, Number),

    // Using a rule in a definition doesn't output the value directly as it does with a string or regex
    //  Instead we get a Builder<T> and we call .build(context) to get our T.
    //  This allows the builder to control both the context for subrule builders and when subrule builders are executed
    (ctx, left, operator, right) => {
        switch (operator[1]) {
            case '+': return left.build(ctx) + right.build(ctx);
            case '-': return left.build(ctx) - right.build(ctx);
        }
    }
)

export const Expr = rule<number>('Expr');
Expr.add(() => def(BinaryExpression), (expr, value) => value.build(expr))
Expr.add(() => def(Number), (expr, value) => value.build(expr))


export const Root = rule('Root',
    () => def(Expr),
    (context, expr) => expr.build(context),
)

const parser = Root.toParser();
const result = parser.parse(null, '0x10 + 1234 - 50');
                          // ^^ the context, again we don't use it so we pass in null

// result is a number (probably will change to an optional of some kind)
console.log(result); // Outputs: 489

//const Expr = rule<Nodes.RefId>('Expr');
//const Atom = rule<Nodes.RefId>('Atom');
//
//// Declarations ================================================================
//// =============================================================================
//Expr.add(rule('Enum',
//    () => {
//        const RKeyword = 'enum'
//        const RName = seq(__, Identifier)
//        const RBody = seq(N_, Body)
//    
//        return definition(RKeyword, RName, RBody);
//    },
//    (context, keyword, name, body) => {
//        return 1234
//    }
//));
//
//// =============================================================================
//Expr.add(rule('Function',
//    () => {
//        const RKeyword = 'fn'
//        const RName = seq(__, Identifier)
//        const RParameters = opt(rep(Parameter))
//        const RReturnType = seq(_, '->', _, Type)
//        const RBody = seq(N_, Body)
//
//        return definition(RKeyword, RName, RParameters, RReturnType, RBody);
//    },
//    (context, keyword, name, parameters, returnType, body) => { }
//));
//
//// =============================================================================
//const Parameter = rule('Parameter',
//    () => {
//        const RKeyword = either([
//            seq('own', __).nth(1),
//            seq('mut', __).nth(1),
//        ]);
//        const RName = Identifier
//        const RType = seq(_, ':', _, Type).nth(3)
//        const RValue = seq(_, '=', _, Expr).nth(3)
//
//        return definition(RKeyword, RName, RType, RValue)
//    },
//    (context, keyword, name, type, value) => {
//
//    }
//);
//
//// =============================================================================
//Expr.add(rule('Struct',
//    () => {
//        const RKeyword = seq('struct', __)
//        const RName = Identifier
//        const RBody = seq(N_, Body)
//
//        return definition(RKeyword, RName, RBody)
//    },
//    (context, keyword, name, body) => {
//        return context.add(children => {
//            return new Nodes.Struct(context.scope, children.scope, name, []);
//        });
//    }
//));
//
//// =============================================================================
//Expr.add(rule('Trait',
//    () => {
//        const RKeyword = seq('struct', __)
//        const RName = Identifier
//        const RBody = seq(N_, Body)
//
//        return definition(RKeyword, RName, RBody)
//    },
//    (context, keyword, name, body) => {
//        return context.add(children => {
//            return new Nodes.Trait(context.scope, children.scope, name, []);
//        });
//    }
//));
//
//// =============================================================================
//Expr.add(rule('Variable',
//    () => {
//        const RKeyword = either([
//            seq('val', __),
//            seq('mut', __),
//        ])
//        const RName = Identifier
//        const RType = seq(_, ':', _, Type).nth(3)
//        const RValue = seq(_, '=', _, Expr).nth(3)
//
//        return definition(RKeyword, RName, RType, RValue)
//    },
//    (context, keyword, name, type, value) => {
//        return context.add(new Nodes.Variable(context.scope, name, undefined as any));
//    }
//));
//
//// Expressions =================================================================
//// =============================================================================
//Expr.add(rule('Break',
//    () => definition('break'),
//    (context, keyword) => context.add(new Nodes.Break(context.scope, null, null))
//));
//
//// =============================================================================
//Expr.add(rule('Call',
//    () => {
//        const RTarget = Atom;
//        const RArgument = Expr;
//        const RArguments = seq('(', rep(seq(N_, RArgument, ExprSep)), ')')
//
//        return definition(RTarget, RArguments);
//    },
//    (context, target, args) => {
//    }
//));
//
//// =============================================================================
//Expr.add(rule('Continue',
//    () => definition('continue'),
//    (context, keyword) => context.add(new Nodes.Continue(context.scope, null, null))
//));
//
//// =============================================================================
//Expr.add(rule('ForEach',
//    () => definition('for', __, Identifier, __, 'in', __, Expr, N_, Body),
//    (context, ...data) => {
//        const element = context.add(new Nodes.Variable(context.scope, data[2], undefined as any));
//        return context.add(new Nodes.ForEach(context.scope, element, data[6].build(context), []))
//    }
//));
//
//// =============================================================================
//Expr.add(rule('If',
//    () => definition('for', __, Identifier, __, 'in', __, Expr, N_, Body),
//    (context, ...data) => {}
//));
//
//// =============================================================================
//Expr.add(rule('Return',
//    () => definition('return', opt(seq(__, Expr))),
//    (context, ...data) => {}
//));
//
//// =============================================================================
//Expr.add(rule('Set',
//    () => definition(Identifier, __, Operator, __, Expr),
//    (context, ...data) => {}
//));
//
//// =============================================================================
//Expr.add(rule('While',
//    () => definition('while', __, Expr, N_, Body),
//    (context, ...data) => {}
//));
//
//// Whitespace ==================================================================
//const comment = /#+\s[ -~]#/                    // Comment
//const __  = /[ \t]+/                            // Requires spaces
//const _   = opt(__)                             // Optional spaces
//const N__ = rep(either([__, comment, '\n']))    // Requires spaces, comments, or newlines
//const N_  = opt(N__)                            // Optional spaces, comments, or newlines
//
//const Newline   = seq(rep(seq(__, comment, '\n')), __)
//const ExprSep = either([Newline, seq(',', N_)])
//const StmtSep = either([Newline, seq(';', _)])
//
//const Operator = /[~!@#$%^&*+=|?/:.\-\\<>]+/
//
//const Body = rule('Body',
//    () => {
//        return definition("{", N_, "}")
//    },
//    (context, a, b, c) => {
//
//    },
//)
//
//// Identifiers
//const Identifier = either([
//    /[a-zA-Z_][a-zA-Z0-9_]+/,
//])
//
//const Type = rule('Type',
//    () => definition(Expr),
//    (context, expr) => expr.build(context)
//)