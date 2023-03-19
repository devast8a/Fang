import { describe, test } from 'mocha'
import { Grammar } from '../grammar'
import { Parser } from '../parser-generator'
import { Ctx } from '../ast/context'
import { Source } from '../common/source'
import * as Nodes from './nodes'
import { assert } from '../common/assert'
import { resolveNames } from '../stages/NameResolver'
import { Tag, VariableFlags } from './nodes'

describe('ast', function() {
    test('functions', () => {
        const { body: [foo] } = parse('fn foo()')

        assert(foo.tag === Tag.Function)
        assert(foo.name === 'foo')
    })

    test('parameters', () => {
        const { context, body: [Foo, func] } = parse('trait Foo; fn func(foo: Foo)')

        assert.type(func, Nodes.Function)
        assert.equals(func.parameters.length, 1)

        const foo = context.get(func.parameters[0])
        assert.equals(foo.name, 'foo')
        assert.equals(foo.flags, VariableFlags.None)

        const fooType = derefGet(context, foo.type)
        assert.equals(fooType, Foo)
    })

    test('return types', () => {
        const { context, body: [Foo, func] } = parse('trait Foo; fn func() -> Foo')

        assert.type(func, Nodes.Function)

        const returnType = derefGet(context, func.returnType)
        assert.equals(returnType, Foo)
    })
})

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

function derefGet(context: Ctx, node: Nodes.Ref) {
    // The reason that types have this indirection through `Get` nodes is that types can be expressions
    //  and expressions that reference an identifier are represented as `Get` nodes.
    // e.g. `Foo` and `Foo & Bar` are valid types and `Foo` and `Bar` are represented as `Get` nodes.
    // I don't think this is a good design decision, perhaps we can remove the concept of `Get` nodes entirely?
    assert.type(node, Nodes.RefById)

    const get = context.get(node)
    assert.type(get, Nodes.Get)

    return context.get(get.source)
}
