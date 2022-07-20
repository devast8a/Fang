import * as Nodes from './ast/nodes';
import { Ctx } from './ast/context';
import { RefId, VariableFlags } from './ast/nodes';

export type Builtins = ReturnType<typeof populateBuiltins>;

export function populateBuiltins(ctx: Ctx) {
    const u32 = mkType(ctx, 'u32');
    const f64 = mkType(ctx, 'f64');
    const bool = mkType(ctx, 'bool');
    const str = mkType(ctx, 'str');
    const nothing = mkType(ctx, 'nothing');

    mkFunc(ctx, 'infix..', u32, [u32, u32]);
    mkFunc(ctx, 'infix%', u32, [u32, u32]);
    mkFunc(ctx, 'infix+', u32, [u32, u32]);
    mkFunc(ctx, 'infix<', bool, [u32, u32]);
    mkFunc(ctx, 'infix==', bool, [u32, u32]);
    mkFunc(ctx, 'infixor', bool, [bool, bool]);
    mkFunc(ctx, 'print', nothing, [str]);

    return {
        count: ctx.nodes.length,
        bool,
        f64,
        str,
        u32,
    };
}

function mkFunc(ctx: Ctx, name: string, returnType: RefId, parameters: RefId[]) {
    return ctx.add(children => {
        const ps = parameters.map((parameter, index) =>
            ctx.add(new Nodes.Variable(children.scope, `_${index}`, parameter, VariableFlags.None))
        );

        return new Nodes.Function(ctx.scope, children.scope, name, returnType, ps, [], true)
    });
}

function mkType(ctx: Ctx, name: string): RefId {
    return ctx.add(children => new Nodes.Struct(ctx.scope, children.scope, name, []));
}