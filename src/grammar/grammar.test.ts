import { describe, Test, test } from 'mocha'
import { expect } from 'chai'
import { Grammar } from './grammar'
import { Parser } from '../parser-generator'
import { promises as fs } from 'fs'
import { join } from 'path'
import { Ctx } from '../ast/context'

const parser = Parser.create(Grammar)

function parse(content: string) {
    parser.parse(Ctx.createRoot(), content)
}

describe('grammar', function() {
    function allow(name: string, code: string)  { test(name, () => parse(code)) }
    function reject(name: string, code: string) { test(name, () => expect(() => parse(code)).throw()) }

    // --- Attributes ---
    allow('attributes on functions',                    `fn foo() #bar #qux`)
    allow('attributes on structures',                   `struct foo #bar #qux`)
    allow('attributes on traits',                       `trait foo #bar #qux`)
    allow('attributes on variables',                    `val foo #bar #qux`)

    reject('attributes without space before',           `val foo#bar #qux`)
    reject('attributes without space between',          `val foo #bar#qux`)

    // --- Body Expressions ---
    allow('body expression binary',                     `fn foo() => bar | qux`)
    allow('body expression call',                       `fn foo() => bar()`)
    allow('body expression index',                      `fn foo() => bar.qux`)

    allow('body expression nested',                     `fn foo() => fn bar() => qux | baz`)

    // --- Control Flow Labels ---
    allow('labels on foreach',                          `for @label val foo in bar {}`)
    allow('labels on if',                               `if @label foo {}`)
    allow('labels on match',                            `match @label foo {}`)
    allow('labels on while',                            `while @label foo {}`)

    allow('labels on break',                            `break @label foo`)
    allow('labels on continue',                         `continue @label`)
    allow('labels on return',                           `return @label foo`)

    // --- Destructuring ---
    //allow('destructuring by name',                      `val {foo, mut bar} = qux`)
    //allow('destructuring by constructor',               `val Temp{foo, mut bar} = qux`)

    // --- Operator ---
    allow('operator double dot',                        `return 10 .. 20`)
    
    // --- Indexable ---
    allow('indexing of call',                           `return foo().bar`)
    allow('indexing of identifier',                     `return foo.bar`)
    allow('indexing of construct',                      `return foo{}.bar`)
    allow('indexing of index',                          `return foo.bar.qux`)
    allow('indexing of postfix operator #1',            `return foo*.bar.qux`)
    allow('indexing of postfix operator #2',            `return foo.bar*.qux`)

    // --- Types ---
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
})

describe('grammar / examples', async function (this) {
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
                parse(content)
            }))
        }
    }

    load('examples')
})