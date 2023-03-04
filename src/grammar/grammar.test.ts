import { describe, Test, test } from 'mocha'
import { expect } from 'chai'
import { Grammar } from './grammar'
import { Parser } from '../parser-generator'
import { promises as fs } from 'fs'
import { join } from 'path'
import { Ctx } from '../ast/context'
import { Source } from '../common/source'

const parser = Parser.create(Grammar)

function parse(path: string, content: string) {
    const context = Ctx.createRoot()
    const body = parser.parse(context, new Source(path, content))
    return { context, body }
}

describe('grammar', function() {
    function allow(name: string, code: string)  { test(name, () => parse(name, code)) }
    function reject(name: string, code: string) { test(name, () => expect(() => parse(name, code)).throw()) }

    // --- Attributes
    allow('attributes on functions',                    `fn foo() #bar #qux`)
    allow('attributes on structures',                   `struct foo #bar #qux`)
    allow('attributes on traits',                       `trait foo #bar #qux`)
    allow('attributes on variables',                    `val foo #bar #qux`)

    reject('attributes without space before',           `val foo#bar #qux`)
    reject('attributes without space between',          `val foo #bar#qux`)

    // --- Body Expressions
    allow('body expression binary',                     `fn foo() => bar | qux`)
    allow('body expression call',                       `fn foo() => bar()`)
    allow('body expression index',                      `fn foo() => bar.qux`)

    allow('body expression nested',                     `fn foo() => fn bar() => qux | baz`)

    // --- Calls
    allow('call: calling a call',                       `return foo()()`)
    allow('call: calling an index',                     `return foo.bar()`)

    // --- Comments
    allow('comment with one hash at EOF',               `#`)
    allow('comment with two hashes at EOF',             `##`)
    allow('comment with three hashes at EOF',           `###`)
    allow('comment with one hash',                      `#\n`)
    allow('comment with two hashes',                    `##\n`)
    allow('comment with three hashes',                  `###\n`)

    // --- Comptime
    allow('comptime foreach',                           `for! x in foo {}`)
    allow('comptime if',                                `if! true {}`)
    allow('comptime match',                             `match! true {}`)
    allow('comptime while',                             `while! true {}`)

    // --- Control Flow Labels
    allow('labels on foreach',                          `for @label foo in bar {}`)
    allow('labels on if',                               `if @label foo {}`)
    allow('labels on match',                            `match @label foo {}`)
    allow('labels on while',                            `while @label foo {}`)

    allow('labels on break',                            `break @label foo`)
    allow('labels on continue',                         `continue @label`)
    allow('labels on return',                           `return @label foo`)

    // --- Destructuring
    //allow('destructuring by name',                      `val {foo, mut bar} = qux`)
    //allow('destructuring by constructor',               `val Temp{foo, mut bar} = qux`)

    // --- Operator
    allow('operator double dot',                        `return 10 .. 20`)
    allow('infix as a name',                            `return infix++`)
    allow('prefix as a name',                           `return prefix++`)
    allow('postfix as a name',                          `return postfix++`)
    reject('space on left, no space on right',          `return 10 +20`)
    reject('no space on left, space on right',          `return 10+ 20`)
    reject('pre- and post-fix operators',               `return +10+`)
    
    // --- Indexable
    allow('indexing of call',                           `return foo().bar`)
    allow('indexing of identifier',                     `return foo.bar`)
    allow('indexing of construct',                      `return foo{}.bar`)
    allow('indexing of index',                          `return foo.bar.qux`)
    allow('indexing of postfix operator #1',            `return foo*.bar.qux`)
    allow('indexing of postfix operator #2',            `return foo.bar*.qux`)

    // --- Literals
    allow('negative numbers',                           `return -10`)

    // --- Parameters named `infix`, `prefix`, and `postfix`
    allow('parameter named `infix`',                    `fn foo(infix+)`)
    allow('parameter named `infix` with type',          `fn foo(infix+: u32)`)
    allow('parameter named `prefix`',                   `fn foo(prefix+)`)
    allow('parameter named `prefix` with type',         `fn foo(prefix+: u32)`)
    allow('parameter named `postfix`',                  `fn foo(postfix+)`)
    allow('parameter named `postfix` with type',        `fn foo(postfix+: u32)`)

    // --- Types
    allow('return type to be index expression',         `fn foo() -> bar.qux`)
    allow('return type to be call expression',          `fn foo() -> bar()`)
    allow('return type to be binary expression',        `fn foo() -> bar | qux`)

    allow('variable type to be binary expression',      `val foo: bar | qux`)
    allow('variable type to be call expression',        `val foo: bar()`)
    allow('variable type to be index expression',       `val foo: bar.qux`)

    allow('long parameter to be binary expression',     `fn foo(x: bar | qux)`)
    allow('long parameter to be call expression',       `fn foo(x: bar())`)
    allow('long parameter to be index expression',      `fn foo(x: bar.qux)`)

    allow('short parameter to be binary expression',    `fn foo(bar | qux)`)
    allow('short parameter to be call expression',      `fn foo(bar())`)
    allow('short parameter to be index expression',     `fn foo(bar.qux)`)

    // --- Variables
    allow('mutable variable, untyped, no value',        `mut foo`)
    allow('immutable variable, untyped, no value',      `val foo`)
    allow('mutable variable, typed, no value',          `mut foo: bar`)
    allow('immutable variable, typed, no value',        `val foo: bar`)
    allow('mutable variable, untyped, with value',      `mut foo = bar`)
    allow('immutable variable, untyped, with value',    `val foo = bar`)
    allow('mutable variable, typed, with value',        `mut foo: bar = qux`)
    allow('immutable variable, typed, with value',      `val foo: bar = qux`)
})

describe('grammar/examples', async function (this) {
    const suite = this

    async function load(path: string) {
        const stat = await fs.stat(path)

        if (stat.isDirectory()) {
            for (const file of await fs.readdir(path)) {
                load(join(path, file))
            }
        } else if (stat.isFile() && path.endsWith('.fang')) {
            const content = await fs.readFile(path, 'utf8')
            
            suite.addTest(new Test(path, () => {
                parse(path, content)
            }))
        }
    }

    load('examples')
})