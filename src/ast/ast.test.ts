import { describe, test } from 'mocha'
import { Grammar } from '../grammar'
import { Parser } from '../parser-generator'
import { Ctx } from '../ast/context'
import { Source } from '../common/source'
import * as Nodes from './nodes'
import { assert } from '../common/assert'
import { resolveNames } from '../stages/NameResolver'
import { Tag, VariableFlags } from './nodes'

const parser = Parser.create(Grammar)

function parse(content: string) {
    const context = Ctx.createRoot()

    // TODO: Set context.root automatically
    const body = parser.parse(context, new Source('<string>', content))
    context.root = body

    // TODO: resolve names should not modify context in place, instead return a new context? (or same context)
    resolveNames(context)

    return {
        context: context,
        body: body.map(node => context.get(node))
    }
}

describe('ast', function() {
    test('functions are parsed into AST nodes correctly', () => {
        const { body: [foo] } = parse('fn foo()')

        assert(foo.tag === Tag.Function)
        assert(foo.name === 'foo')
    })

    test('parameters are parsed into AST nodes correctly', () => {
        const { context, body: [Foo, func] } = parse('trait Foo; fn func(foo: Foo)')

        assert.type(func, Nodes.Function)
        assert.equals(func.parameters.length, 1)

        const foo = context.get(func.parameters[0])
        assert.equals(foo.name, 'foo')
        assert.equals(foo.flags, VariableFlags.None)

        // TODO: Remove this indirection
        const foo_type = context.get(foo.type)
        assert.type(foo_type, Nodes.Get)

        assert.equals(context.get(foo_type.source), Foo)
    })
})