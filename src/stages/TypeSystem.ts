import { Ctx } from '../ast/context'
import { Distance, Function, isRef, Node, Ref, RefById, RefByIds, Tag } from '../ast/nodes'
import { unimplemented, unreachable } from '../common/utils'
import { assert } from '../common/assert'

type List<T> = readonly T[]

export function processType(types: TypeSystemState, node: Node) {
    const ctx = types.ctx

    switch (node.tag) {
        case Tag.BlockAttribute: {
            // TODO: Implement block attribute
            break
        }

        case Tag.Break: {
            break
        }

        case Tag.Call: {
            types.typeof(node, 'func')

            if (node.func.tag === Tag.RefByIds) {
                const fn = resolveOverload(types, node.func, getTypes(types, node.args));

                // Overload has been resolved.
                (node as any).func = fn
            }

            // TODO: Fix after node.func is marked as Ref rather than Ref<Function>
            const fn = ctx.get(node.func) as Node

            switch (fn.tag) {
                case Tag.Function: types.set(node, ctx.get(node.func).returnType); break
                case Tag.Variable: types.set(node, types.get(fn)); break
                default: throw unimplemented(fn as never)
            }

            break
        }

        case Tag.Constant: {
            types.set(node, node.type)
            break
        }

        case Tag.Continue: {
            break
        }

        case Tag.Construct: {
            types.set(node, node.type)
            break
        }

        case Tag.ForEach: {
            // TODO: Support element.
            for (const ref of node.body) {
                processType(types, ctx.get(ref))
            }
            break
        }

        case Tag.Function: {
            types.set(node, node)

            if (node.returnType.tag === Tag.RefInfer) {
                node.returnType = ctx.builtins.nothing

                if (node.body.length > 0) {
                    const lastNode = ctx.get(node.body[node.body.length - 1])

                    if (lastNode.tag === Tag.Return) {
                        const type = types.get(lastNode)
                        if (type === null) {
                            //console.log(type);
                            break
                        }
                        node.returnType = mkRef(type)
                    }
                }
            }
            break
        }

        case Tag.Get: {
            types.typeof(node, 'source')
            types.set(node, types.get(node.source))
            break
        }

        case Tag.If: {
            for (const c of node.cases) {
                if (c.condition !== null) {
                    processType(types, ctx.get(c.condition))
                }

                for (const ref of c.body) {
                    processType(types, ctx.get(ref))
                }
            }

            break
        }

        case Tag.Move: {
            break
        }

        case Tag.Return: {
            types.set(node, node.value === null ? ctx.builtins.nothing : types.get(node.value))
            break
        }

        case Tag.Set: {
            types.set(node, types.get(node.source))

            // TODO: This is a hack to get RefByExpr working.
            if (node.target.tag !== Tag.RefByExpr) {
                const target = ctx.get(node.target)
                if (types.get(target) === null) {
                    types.set(target, types.get(node.source))
                }
            }
            break
        }

        case Tag.Struct: {
            types.set(node, node)
            break
        }

        case Tag.Trait: {
            types.set(node, node)
            break
        }

        case Tag.Variable: {
            if (node.type.tag === Tag.RefInfer) {
                break
            }

            types.set(node, node.type)
            break
        }

        case Tag.While: {
            processType(types, ctx.get(node.condition))

            for (const ref of node.body) {
                processType(types, ctx.get(ref))
            }
            break
        }

        default: {
            throw unimplemented(node as never)
        }
    }
}

export function processTypes(ctx: Ctx) {
    const types = new TypeSystemState(ctx)

    // Hack 'self' to work.
    for (const node of ctx.nodes) {
        if (node.tag !== Tag.Struct) {
            continue
        }

        for (const memberRef of node.body) {
            const member = ctx.get(memberRef)

            if (member.tag === Tag.Function) {
                for (const parameterRef of member.parameters) {
                    const parameter = ctx.get(parameterRef)

                    if (parameter.name === 'self' && parameter.type.tag === Tag.RefInfer) {
                        parameter.type = new RefById(null, node.id, Distance.Global)
                    }
                }
            }
        }
    }

    for (const node of ctx.nodes) {
        processType(types, node)
    }
}

export class TypeSystemState {
    public readonly types: Array<Node | null>

    public constructor(
        readonly ctx: Ctx,
    ) {
        this.types = new Array(ctx.nodes.length).fill(null)
    }

    public typeof<T extends Node | Ref, K extends keyof T>(node: T, field: K): Node | null {
        const ref = node[field] as any as Ref

        switch (ref.tag) {
            case Tag.RefById: {
                return this.types[ref.id]
            }

            case Tag.RefByIds: {
                return this.types[ref.ids[0]]
            }

            case Tag.RefByName: {
                if (ref.object === null) {
                    return null
                }

                const object = this.typeof(ref, 'object')
                if (object === null) {
                    return null
                }

                if (object.tag !== Tag.Struct && object.tag !== Tag.Trait) {
                    return null
                }

                const members = []
                for (const memberRef of object.body) {
                    const member = this.ctx.get(memberRef)

                    if ((member as any).name === ref.name) {
                        members.push(member.id)
                    }

                    if (member.tag === Tag.Set) {
                        const target = this.ctx.get(member.target)

                        if (target.name === ref.name) {
                            members.push(target.id)
                        }
                    }
                }

                if (members.length === 1) {
                    (node as any)[field] = new RefById(ref.object, members[0], Distance.Local)
                } else if (members.length > 1) {
                    (node as any)[field] = new RefByIds(ref.object, members, Distance.Local)
                }

                return null
            }
        }

        return null
    }

    public get(expr: Node | Ref): Node | null {
        if (isRef(expr)) {
            switch (expr.tag) {
                case Tag.RefById: {
                    return this.types[expr.id]
                }

                case Tag.RefByIds: {
                    return this.types[expr.ids[0]]
                }

                case Tag.RefByName: {
                    // Unresolved symbol
                    if (expr.object === null) {
                        return null
                    }

                    const member = this.member(expr.object, expr.name)
                    if (member === null) {
                        return null
                    }

                    return this.types[member.id]
                }

                case Tag.RefByExpr: {
                    if (expr.object === null) {
                        return null
                    }

                    // ???
                    return this.ctx.get(this.ctx.builtins.u32)
                }

                case Tag.RefInfer: {
                    return null
                }
            }

            throw unreachable(expr)
        }

        return this.types[expr.id]
    }

    public set(expr: Node, type: Node | Ref | null) {
        if (type === null || !isRef(type)) {
            return this.types[expr.id] = type
        }

        switch (type.tag) {
            case Tag.RefById: {
                return this.types[expr.id] = this.ctx.nodes[type.id]
            }

            case Tag.RefByIds: {
                return this.types[expr.id] = this.ctx.nodes[type.ids[0]]
            }

            default: {
                return null
            }
        }

        throw unreachable(type as never)
    }

    public member(expr: Ref, name: string) {
        const struct = this.get(expr)

        if (struct === null) {
            return null
        }

        switch (struct.tag) {
            case Tag.Struct: {
                for (const memberId of struct.body) {
                    const member = this.ctx.get(memberId)

                    if (member.tag === Tag.Variable && member.name === name) {
                        return member
                    }
                }

                return null
            }

            default: {
                throw unimplemented(struct as any)
            }
        }
    }
}

function mkRef(node: Node) {
    return new RefById(null, node.id, Distance.Global)
}

function matchOverload(targets: List<Node>, source: List<Node>): boolean {
    if (targets.length !== source.length) {
        return false
    }

    for (let i = 0; i < targets.length; i++) {
        if (targets[i] !== source[i]) {
            return false
        }
    }

    return true
}

function resolveOverload(types: TypeSystemState, functions: RefByIds<Function>, argumentTypes: readonly Node[]) {
    for (const id of functions.ids) {
        const fn = types.ctx.nodes[id]
        assert(fn instanceof Function)

        const parameterTypes = getTypes(types, fn.parameters)

        if (types.ctx.get(fn.parameters[0]).name === 'self') {
            parameterTypes.shift()
        }

        if (matchOverload(parameterTypes, argumentTypes)) {
            return new RefById(functions.object, id, functions.distance)
        }
    }

    return null
}

function getTypes(types: TypeSystemState, refs: List<RefById>) {
    return refs.map(id => {
        const type = types.get(id)

        if (type === null) {
            // This error indicates one of:
            //  - The expression relies on a return type of a function that has not been processed
            //  - The invariant was broken 'all expressions in a function are topologically sorted'
            throw new Error('A requested type has not yet been resolved')
        }

        return type
    })
}
