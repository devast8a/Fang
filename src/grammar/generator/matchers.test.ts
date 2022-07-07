import {expect} from 'chai';
import 'mocha';
import { unreachable } from '../../utils';
import { either, list, Matcher, opt, Rules, seq, star } from './matchers';

const { rule, def } = Rules<any>()

/**
 * Creates a parser for testing
 *  To test normal behavior of the matcher, provide a matcher directly
 *  To test subrule behavior of the matcher, provide a function that takes a rule and returns a matcher
 */ 
function createParser<T>(matcher: Matcher<T> | ((subrule: Matcher) => Matcher<T>))
{
    if (matcher instanceof Matcher) {
        const parser = matcher.toParser()
        return (content: string) => parser.parse('simple', content)
    }

    const subrule = rule(/[a-z]/, (ctx, name) => `${ctx}:${name}`)
    const parser = matcher(subrule).toParser()
    
    return (content: string) => parser.parse('subrule', content)
}

describe('Grammar Generator', () => {
    describe('either', () => {
        const simple = createParser(either(['a', 'b', 'c']))
        const subrule = createParser(subrule => either([subrule]))

        it('matches content', () => {
            expect(simple('a')).equals('a')
            expect(simple('b')).equals('b')
            expect(simple('c')).equals('c')
        })

        it('builds subrules', () => {
            expect(subrule('a')).equals('subrule:a')
            expect(subrule('b')).equals('subrule:b')
            expect(subrule('c')).equals('subrule:c')
        })
    })


    describe('list', () => {
        const simple = createParser(list(/[a-z]/, /[+-]/))
        const subrule = createParser(subrule => list(subrule, /[+-]/))

        it('matches a single element', () => {
            expect(simple('a').elements).deep.equals(['a'])
        })

        it('matches multiple element', () => {
            expect(simple('a+b-c').elements).deep.equals(['a', 'b', 'c'])
        })

        it('matches separators', () => {
            expect(simple('a+b-c').separators).deep.equals(['+', '-'])
        })

        it('builds subrules', () => {
            expect(subrule('a+b-c').elements).deep.equals(['subrule:a', 'subrule:b', 'subrule:c'])
        })
    })

    describe('opt', () => {
        const simple = createParser(opt('a'))
        const subrule = createParser(subrule => opt(subrule))

        it('matches nothing', () => {
            expect(simple('')).equals(null)
        })

        it('matches content', () => {
            expect(simple('a')).equals('a')
        })

        it('builds subrules', () => {
            expect(subrule('a')).equals('subrule:a')
            expect(subrule('')).equals(null)
        })
    })

    describe('seq', () => {
        const simple = createParser(seq('a', 'b', 'c'))
        const subrule = createParser(subrule => seq(subrule, subrule, subrule))

        it('matches input', () => {
            expect(simple('abc')).deep.equals(['a', 'b', 'c'])
        })

        it('builds subrules', () => {
            expect(subrule('abc')).deep.equals(['subrule:a', 'subrule:b', 'subrule:c'])
        })

        describe('get', () => {
            const simple = createParser(seq('a', 'b', 'c').get(1))
            const subrule = createParser(subrule => seq(subrule, subrule, subrule).get(1))

            it('gets nth match', () => {
                expect(simple('abc')).equals('b')
            })

            it('builds subrules', () => {
                expect(subrule('abc')).equals('subrule:b')
            })
        })
    })

    describe('star', () => {
        const simple = createParser(star('[', opt(/ +/), /[a-z]/, /[+-]/, ']'))
        const subrule = createParser(subrule => star('[', opt(/ +/), subrule, /[+-]/, ']'))

        it('matches start and end', () => {
            expect(simple('[]').start).equals('[')
            expect(simple('[]').end).equals(']')
        })

        it('matches empty bodies', () => {
            expect(simple('[]').elements).deep.equals([])
        })

        it('does not introduce ambiguity in optional space', () => {
            expect(simple('[ ]').startSpace).equals(' ')
            expect(simple('[ ]').endSpace).equals(null)
        })

        it('matches a single element', () => {
            expect(simple('[a]').elements).deep.equals(['a'])
        })

        it('matches multiple elements', () => {
            expect(simple('[a+b-c]').elements).deep.equals(['a', 'b', 'c'])
        })

        it('matches separators', () => {
            expect(simple('[a+b-c]').separators).deep.equals(['+', '-'])
        })

        it('matches spaces', () => {
            expect(simple('[ a  ]').startSpace).equals(' ')
            expect(simple('[ a  ]').endSpace).equals('  ')
        })

        it('builds subrules', () => {
            expect(subrule('[a+b-c]').elements).deep.equals(['subrule:a', 'subrule:b', 'subrule:c'])
        })

        describe('get', () => {
            const simple = createParser(star('[', opt(/ +/), /[a-z]/, /[+-]/, ']').elements)
            const subrule = createParser(subrule => star('[', opt(/ +/), subrule, /[+-]/, ']').elements)

            it('gets nth match', () => {
                expect(simple('[a+b-c]')).deep.equals(['a', 'b', 'c'])
            })

            it('builds subrules', () => {
                expect(subrule('[a+b-c]')).deep.equals(['subrule:a', 'subrule:b', 'subrule:c'])
            })
        })
    })

    it('Reorders tokens (constant first)', () => {
        const Grammar = rule<string>()
        Grammar.add('foo', () => 'constant')
        Grammar.add(/[a-z]+/, () => 'pattern')

        const parser = Grammar.toParser()
        expect(parser.parse(null, 'foo')).equals('constant')
        expect(parser.parse(null, 'bar')).equals('pattern')
        expect(parser.parse(null, 'foobar')).equals('pattern')
    });

    it('Reorders tokens (pattern first)', () => {
        const Grammar = rule<string>()
        Grammar.add(/[a-z]+/, () => 'pattern')
        Grammar.add('foo', () => 'constant')

        const parser = Grammar.toParser()
        expect(parser.parse(null, 'foo')).equals('constant')
        expect(parser.parse(null, 'bar')).equals('pattern')
        expect(parser.parse(null, 'foobar')).equals('pattern')
    });

    it('Calculator Example', () => {
        const Number = rule<number>();
        Number.add(/0x[0-9]+/, (ctx, number) => parseInt(number.slice(2), 16));
        Number.add(/0b[0-9]+/, (ctx, number) => parseInt(number.slice(2), 2));
        Number.add(/[0-9]+/, (ctx, number) => parseInt(number));

        const Operator = either(['+', '-']);

        const Expr = rule<number>();
        Expr.add(Number, (ctx, number) => number.build(ctx));
        Expr.add(def(Expr, Operator, Number), (ctx, left, operator, right) => {
            switch (operator) {
                case '+': return left.build(ctx) + right.build(ctx);
                case '-': return left.build(ctx) - right.build(ctx);
            }
            throw unreachable(operator);
        })

        const parser = Expr.toParser();
        const result = parser.parse(null, '0x10+8+0b10');
        expect(result).equals(0x10 + 8 + 0b10);
    });
})