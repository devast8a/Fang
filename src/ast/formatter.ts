import { unreachable } from '../common/utils'
import { Ctx } from './context'
import { Distance, Node, Ref, Tag } from './nodes'


export function formatNodeRef(ctx: Ctx, ref: Ref, declaration = false): string {
    if (ref.tag !== Tag.RefById) {
        return formatRef(ctx, ref)
    }

    if (!declaration) {
        switch (ctx.get(ref).tag) {
            case Tag.Function:
            case Tag.Struct:
            case Tag.Trait:
            case Tag.Variable:
                return formatRef(ctx, ref)
        }
    }

    return formatNode(ctx, ctx.get(ref), declaration)
}


export function formatNode(ctx: Ctx, node: Node, declaration = false): string {
    switch (node.tag) {
        case Tag.BlockAttribute: {
            const target = formatRef(ctx, node.attribute)

            return `##${target}`
        }

        case Tag.Break: {
            return `break`
        }

        case Tag.Call: {
            const func = formatNodeRef(ctx, node.func)
            const args = formatNodes(ctx, node.args, { join: ', ', declaration: false })

            return `${func}(${args})`
        }

        case Tag.Constant: {
            return JSON.stringify(node.value)
        }

        case Tag.Construct: {
            const type = formatNodeRef(ctx, node.type)
            const args = formatNodes(ctx, node.args, { join: ', ', declaration: false })

            return `${type}{${args}}`
        }

        case Tag.Destruct: {
            return `destruct ${formatNodeRef(ctx, node.value)}`
        }

        case Tag.Function: {
            if (!declaration) return node.name ?? '<anonymous>'

            const name = `${node.name}[#${node.id}]`
            const ps = formatNodes(ctx, node.parameters, { join: ', ' })
            const body = formatNodes(ctx, node.body, { indented: true })

            return `fn ${name} (${ps}) {${body}}`
        }

        case Tag.ForEach: {
            const element = formatNodeRef(ctx, node.element)
            const collection = formatNodeRef(ctx, node.collection)
            const body = formatNodes(ctx, node.body, { indented: true })

            return `for ${element} in ${collection} {${body}}`
        }

        case Tag.Get: {
            return formatRef(ctx, node.source)
        }

        case Tag.Group: {
            const body = formatNodes(ctx, node.body, { join: '; ' })
            return `(${body})`
        }

        case Tag.If: {
            const cond = formatNodeRef(ctx, node.cases[0].condition!)
            const body = formatNodes(ctx, node.cases[0].body, { indented: true })

            return `if ${cond} {${body}}`
        }

        case Tag.Return: {
            const value = node.value === null ? '' : formatNodeRef(ctx, node.value)

            return `return ${value}`
        }

        case Tag.Set: {
            const target = formatNodeRef(ctx, node.target)
            const source = formatNodeRef(ctx, node.source)

            return `${target} = ${source}`
        }

        case Tag.Struct: {
            if (!declaration) return node.name ?? '<anonymous>'

            const body = formatNodes(ctx, node.body, { indented: true })
            const name = `${node.name}[#${node.id}]`

            return `struct ${name} {${body}}`
        }

        case Tag.Trait: {
            if (!declaration) return node.name ?? '<anonymous>'

            const body = formatNodes(ctx, node.body, { indented: true })
            const name = `${node.name}[#${node.id}]`

            return `trait ${name} {${body}}`
        }

        case Tag.Variable: {
            if (!declaration) return node.name ?? '<anonymous>'

            const name = `${node.name}[#${node.id}]`

            return `val ${name}`
        }

        case Tag.While: {
            const cond = formatNodeRef(ctx, node.condition)
            const body = formatNodes(ctx, node.body, { indented: true })

            return `while ${cond} {${body}}`
        }

        default: {
            return `[${Tag[node.tag]}]`
        }
    }
}

export function formatDistance(ctx: Ctx, ref: Ref) {
    switch (ref.tag) {
        case Tag.RefById:
        case Tag.RefByIds:
            switch (ref.distance) {
                case Distance.Global: return `^G`
                case Distance.Local: return ``
                default: return `^${ref.distance}`
            }

        case Tag.RefByExpr:
        case Tag.RefByName:
        case Tag.RefInfer:
            return ``
    }
}

export function formatRef(ctx: Ctx, ref: Ref): string {
    const object = ref.object === null ? '' : formatNodeRef(ctx, ref.object) + '.'
    const distance = formatDistance(ctx, ref)

    switch (ref.tag) {
        case Tag.RefByExpr: {
            const target = formatNodeRef(ctx, ref.values[0])
            return `${object}[${target}]`
        }

        case Tag.RefById: {
            const target = (ctx.get(ref) as any).name ?? '<anonymous>'
            return `${object}${target}[${ref.id}${distance}]`
        }

        case Tag.RefByIds: {
            const target = (ctx.get(ref) as any).name ?? '<anonymous>'
            return `${object}${target}[${ref.ids.join(',')}${distance}]`
        }

        case Tag.RefByName: {
            return `${object}${ref.name}[?]`
        }

        case Tag.RefInfer: {
            return `${object}<infer>`
        }
    }
    throw unreachable(ref)
}

interface Options {
    indented?: boolean
    join?: string
    declaration?: boolean
}

export function formatNodes(ctx: Ctx, nodes: readonly Ref[], options?: Options) {
    const {
        declaration,
        indented,
        join,
    } = Object.assign({
        declaration: true,
        indented: false,
        join: '\n',
    }, options)

    const result = nodes.map(ref => formatNodeRef(ctx, ref, declaration)).join(join)
    return indented ? indent(result) : result
}

function indent(string: string) {
    if (string === '') {
        return ''
    }

    return '\n    ' + string.replace(/\n/g, '\n    ') + '\n'
}
