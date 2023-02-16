import { describe, test } from 'mocha'
import { Equal } from '../common/type-level-utils'
import { Syntax, Parser, CONFIG, SEQ, OPT, ANY, REP, Def, Transformer, GetType, LIST } from './parser-generator'
import { expect } from 'chai'
import { Source } from '../common/source'

type Context = 'CONTEXT'
const $ = CONFIG<Context>()

const Foo = new Syntax('Foo', $<'foo'>())
Foo.match(() => 'foo')

const Bar = new Syntax('Bar', $<'bar'>())
Bar.match(() => 'bar')

function parse<D extends Def>(definition: D, input: string): GetType<D>
function parse<D extends Def, T>(definition: D, input: string, transform: Transformer<D, Context, T>): T
function parse(definition: Def, input: string, transform?: Transformer<any, any, any>): any {
    const syntax = new Syntax('syntax', $.undefined)
    syntax.match(() => definition as any, transform as any)
    const parser = Parser.create(syntax)
    return parser.parse('CONTEXT', Source.fromString(input))
}

type True = (left: any, right: any) => true
function check_type<X, Y>(): Equal<X, Y> { return undefined as any }
function check_types<D extends Def>(definition: D, transformer: Transformer<D, Context, True[]>) {}

describe('parser-generator', () => {
    describe('Syntax', () => {
        test('context is set in transformer', () => {
            const result = parse('foo', 'foo', _ => _.context)
            expect(result).deep.equal('CONTEXT')
        })

        test('value is set in transformer', () => {
            const result = parse('foo', 'foo', _ => _.value)
            expect(result).deep.equal('foo')
        })
    })

    describe('SEQ', () => {
        test('matches multiple arguments', () => {
            const result = parse(SEQ('abc', Foo, Bar), 'abcfoobar')
            expect(result).deep.equal(['abc', 'foo', 'bar'])
        })

        test('does not match no input', () => {
            expect(() => parse(SEQ(Foo), '')).throw('Incomplete parse')
        })

        test('context is set in transformer', () => {
            const result = parse(SEQ(Foo), 'foo', _ => _.context)
            expect(result).deep.equal('CONTEXT')
        })

        test('value is set in transformer', () => {
            const result = parse(SEQ(Foo), 'foo', _ => _.value[0] + "!")
            expect(result).deep.equal('foo!')
        })

        test('fields are set in transformer', () => {
            const result = parse(SEQ(Foo, Bar), 'foobar', _ => _.Foo + "!")
            expect(result).deep.equal('foo!')
        })

        test('transformer types', () => {
            check_types(SEQ('abc', Foo, Bar), _ => [
                check_type<typeof _.context, Context>,
                check_type<typeof _.value, ['abc', 'foo', 'bar']>,
                check_type<typeof _.Foo, 'foo'>,
                check_type<typeof _.Bar, 'bar'>,
            ])
        })
    })

    describe('OPT', () => {
        test('matches a single argument', () => {
            const result = parse(OPT(Foo), 'foo')
            expect(result).deep.equal('foo')
        })

        test('matches multiple arguments', () => {
            const result = parse(OPT('abc', Foo, Bar), 'abcfoobar')
            expect(result).deep.equal(['abc', 'foo', 'bar'])
        })

        test('matches no input with a single argument', () => {
            const result = parse(OPT(Foo), '')
            expect(result).deep.equal(null)
        })

        test('matches no input with multiple arguments', () => {
            const result = parse(OPT('abc', Foo, Bar), '')
            expect(result).deep.equal(null)
        })

        test('context is set in transformer', () => {
            const result = parse(OPT(Foo), 'foo', _ => _.context)
            expect(result).deep.equal('CONTEXT')
        })

        test('value is set in transformer', () => {
            const result = parse(OPT(Foo), 'foo', _ => _.value + "!")
            expect(result).deep.equal('foo!')
        })

        test('fields are set in transformer with single argument', () => {
            const result = parse(OPT(Foo), 'foo', _ => _.Foo + "!")
            expect(result).deep.equal('foo!')
        })

        test('fields are set in transformer with multiple arguments', () => {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const result = parse(OPT(Foo, Bar), 'foobar', _ => _.Foo! + _.Bar! + "!")
            expect(result).deep.equal('foobar!')
        })

        test('fields are set in transformer with single argument and no input', () => {
            const result = parse(OPT(Foo), '', _ => _.Foo)
            expect(result).deep.equal(null)
        })

        test('fields are set in transformer with multiple arguments and no input', () => {
            const result = parse(OPT(Foo, Bar), '', _ => [_.Foo, _.Bar])
            expect(result).deep.equal([null, null])
        })

        test('transformer types with a single argument', () => {
            check_types(OPT(Foo), _ => [
                check_type<typeof _.context, Context>,
                check_type<typeof _.value, 'foo' | null>,
                check_type<typeof _.Foo, 'foo' | null>,
            ])
        })

        test('transformer types with multiple arguments', () => {
            check_types(OPT('abc', Foo, Bar), _ => [
                check_type<typeof _.context, Context>,
                check_type<typeof _.value, ['abc', 'foo', 'bar'] | null>,
                check_type<typeof _.Foo, 'foo' | null>,
                check_type<typeof _.Bar, 'bar' | null>,
            ])
        })
    })

    describe('ANY', () => {
        test('matches a single argument', () => {
            const result = parse(ANY(Foo), 'foo')
            expect(result).deep.equal('foo')
        })

        test('matches multiple arguments #1', () => {
            const result = parse(ANY('abc', Foo, Bar), 'abc')
            expect(result).deep.equal('abc')
        })

        test('matches multiple arguments #2', () => {
            const result = parse(ANY('abc', Foo, Bar), 'foo')
            expect(result).deep.equal('foo')
        })

        test('does not match no input', () => {
            expect(() => parse(ANY(Foo), '')).throw('Incomplete parse')
        })

        test('context is set in transformer', () => {
            const result = parse(ANY(Foo), 'foo', _ => _.context)
            expect(result).deep.equal('CONTEXT')
        })

        test('value is set in transformer', () => {
            const result = parse(ANY(Foo), 'foo', _ => _.value + "!")
            expect(result).deep.equal('foo!')
        })

        test('fields are set in transformer', () => {
            const result = parse(ANY(Foo, Bar), 'foo', _ => _.Foo)
            expect(result).deep.equal('foo')
        })

        test('fields are set in transformer (other fields are null)', () => {
            const result = parse(ANY(Foo, Bar), 'foo', _ => _.Bar)
            expect(result).deep.equal(null)
        })

        test('transformer types', () => {
            check_types(ANY('abc', Foo, Bar), _ => [
                check_type<typeof _.context, Context>,
                check_type<typeof _.value, 'abc' | 'foo' | 'bar'>,
                check_type<typeof _.Foo, 'foo' | null>,
                check_type<typeof _.Bar, 'bar' | null>,
            ])
        })
    })

    describe('REP', () => {
        test('matches one input with a single argument', () => {
            const result = parse(REP(Foo), 'foo')
            expect(result).deep.equal(['foo'])
        })

        test('matches one input with multiple arguments', () => {
            const result = parse(REP('abc', Foo, Bar), 'abcfoobar')
            expect(result).deep.equal([['abc', 'foo', 'bar']])
        })

        test('matches multiple inputs with a single argument', () => {
            const result = parse(REP(Foo), 'foofoofoo')
            expect(result).deep.equal(['foo', 'foo', 'foo'])
        })

        test('matches multiple inputs with multiple arguments', () => {
            const result = parse(REP('abc', Foo, Bar), 'abcfoobarabcfoobar')
            expect(result).deep.equal([['abc', 'foo', 'bar'], ['abc', 'foo', 'bar']])
        })

        test('does not match no input', () => {
            expect(() => parse(REP(Foo), '')).throw('Incomplete parse')
        })

        test('context is set in transformer', () => {
            const result = parse(REP(Foo), 'foo', _ => _.context)
            expect(result).deep.equal('CONTEXT')
        })

        test('value is set in transformer', () => {
            const result = parse(REP(Foo), 'foo', _ => _.value + "!")
            expect(result).deep.equal('foo!')
        })

        test('fields are set in transformer', () => {
            const result = parse(REP(Foo), 'foofoofoo', _ => _.Foo)
            expect(result).deep.equal(['foo', 'foo', 'foo'])
        })

        test('fields are set in transformer', () => {
            const result = parse(REP(Foo, Bar), 'foobarfoobarfoobar', _ => _.Foo)
            expect(result).deep.equal(['foo', 'foo', 'foo'])
        })

        test('transformer types with a single argument', () => {
            check_types(REP(Foo), _ => [
                check_type<typeof _.context, Context>,
                check_type<typeof _.value, 'foo'[]>,
                check_type<typeof _.Foo, 'foo'[]>,
            ])
        })

        test('transformer types with multiple arguments', () => {
            check_types(REP('abc', Foo, Bar), _ => [
                check_type<typeof _.context, Context>,
                check_type<typeof _.value, ['abc', 'foo', 'bar'][]>,
                check_type<typeof _.Foo, 'foo'[]>,
                check_type<typeof _.Bar, 'bar'[]>,
            ])
        })
    })

    describe('LIST', () => {
        const Name = new Syntax('Name', $<string>())
        Name.match(() => /[a-z]+/)

        const FULL_LIST = LIST('(', OPT(' '), /[a-z]+/, ',', ')')
        const PARTIAL_LIST = LIST(OPT(' '), /[a-z]+/, ',')
        const SHORT_FORM = LIST(Name, { start: null, whitespace: OPT(' '), separator: ',', end: null })

        test('matches zero inputs', () => {
            const result = parse(FULL_LIST, '()', _ => _.value.elements)
            expect(result).deep.equal([])
        })

        test('matches multiple inputs', () => {
            const result = parse(FULL_LIST, '(a,b,c)', _ => _.value.elements)
            expect(result).deep.equal(['a', 'b', 'c'])
        })

        test('matches zero inputs (Partial List)', () => {
            const result = parse(PARTIAL_LIST, '', _ => _.value.elements)
            expect(result).deep.equal([])
        })

        test('matches multiple inputs (Partial List)', () => {
            const result = parse(PARTIAL_LIST, 'a,b,c', _ => _.value.elements)
            expect(result).deep.equal(['a', 'b', 'c'])
        })

        test('matches multiple inputs (Short Form)', () => {
            const result = parse(SHORT_FORM, 'a,b,c', _ => _.value)
            expect(result).deep.equal(['a', 'b', 'c'])
        })

        test('transformer types', () => {
            check_types(FULL_LIST, _ => [
                check_type<typeof _.context, Context>,
                check_type<typeof _.value.start, '('>,
                check_type<typeof _.value.startWs, ' ' | null>,
                check_type<typeof _.value.elements, string[]>,
                check_type<typeof _.value.separators, ','[]>,
                check_type<typeof _.value.endWs, ' ' | null>,
                check_type<typeof _.value.end, ')'>,
            ])
        })
    })
})