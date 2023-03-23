import { Ctx } from '../ast/context'
import { Destruct, Distance, Group, RefById, Tag, VariableFlags } from '../ast/nodes'
import { Flags } from '../common/flags'
import { unimplemented } from '../common/utils'
import { assert } from '../common/assert'

function check(state: State, ref: RefById, access: Access, group?: AccessGroup) {
    const ctx = state.ctx
    const node = ctx.get(ref)

    switch (node.tag) {
        case Tag.BlockAttribute: {
            // TODO: Implement
            return
        }

        case Tag.Call: {
            // Parameters?
            const group = new AccessGroup()

            const fn = ctx.get(node.func)
            for (let i = 0; i < node.args.length; i++) {
                const p = ctx.get(fn.parameters[i])

                check(state, node.args[i], Flags.has(p.flags, VariableFlags.Mutable) ? Access.Write : Access.Read, group)
            }

            return
        }

        case Tag.Constant: {
            return
        }

        case Tag.Construct: {
            // TODO: Implement
            return
        }

        case Tag.Function: {
            return
        }

        case Tag.Get: {
            assert(node.source.tag === Tag.RefById)

            if (state.liveness.get(node.source.id) !== Liveness.Alive) {
                throw new Error('Lifetime error')
            }

            return
        }

        case Tag.If: {
            return
        }

        case Tag.Move: {
            const value = ctx.get(node.value)

            assert(value.tag === Tag.Get && value.source.tag === Tag.RefById)

            state.liveness.set(value.source.id, Liveness.Dead)
            console.log(state.liveness)
            break
        }

        // left.field = right
        case Tag.Set: {
            assert(node.target.tag === Tag.RefById)

            // == Semantics ====================================================
            // Execute left
            check(state, node.source, Access.Read)

            // destroy the previous value in variable.
            if (state.liveness.get(node.target.id) === Liveness.Alive) {
                ctx.replace(node.id, new Group([
                    ctx.add(new Destruct(new RefById(null, node.target.id, Distance.Local))),
                    ctx.add(node),
                ]))
            }

            // Execute right
            check(state, node.target, Access.Read)

            // == Result =======================================================
            // Mark left.field as alive
            state.liveness.set(node.target.id, Liveness.Alive)

            // == Additional Checks ============================================
            const source = ctx.get(node.source)
            if (source.tag === Tag.Get) {
                throw new Error('Lifetime error: right must use `copy` or `move`.')
            }

            return
        }

        case Tag.Struct: {
            return
        }

        case Tag.Trait: {
            return
        }

        case Tag.Variable: {
            // This check exists because we can't distinguish between declaring a variable with a value and assigning to
            //  and existing variable. 'val foo = ...' vs 'foo = ...'
            if (!state.liveness.has(node.id)) {
                state.declarations.push(node.id)
                state.liveness.set(node.id, Liveness.Dead)
            }
            return
        }

        default: {
            throw unimplemented(node as never)
        }
    }
}

function checkBody(state: State, refs: RefById[]) {
    for (const ref of refs) {
        check(state, ref, Access.Read)
    }

    for (const declaration of state.declarations.reverse()) {
        if (state.liveness.get(declaration) === Liveness.Alive) {
            refs.push(state.ctx.add(new Destruct(new RefById(null, declaration, 0))))
        }
    }
}


export function LifetimeTracking(ctx: Ctx) {
    const state = new State(null, ctx)
    checkBody(state, ctx.root)
}

export enum Liveness {
    Dead = 'Dead',
    Alive = 'Alive',
    Dynamic = 'Dynamic',
}

export class State {
    public declarations = new Array<number>();
    public liveness = new Map<number, Liveness>();

    constructor(
        readonly parent: State | null,
        readonly ctx: Ctx,
    ) { }
}

class AccessGroup {

}

enum Access {
    Read,
    Write,
}