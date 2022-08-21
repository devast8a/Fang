import * as Nodes from './ast/nodes';
import { Ctx } from './ast/context';
import { LocalRef, VariableFlags } from './ast/nodes';
import { Scope, ScopeType } from "./ast/Scope";

export type Builtins = ReturnType<typeof populateBuiltins>;

export function populateBuiltins(ctx: Ctx) {
    const scope = new Scope(null, new Map(), new Map(), ScopeType.Global);

    const List    = mkType(ctx, scope, 'Lst');
    // const Math    = mkType(ctx, scope, 'Math');
    // const Num     = mkType(ctx, scope, 'Num');
    //const String  = mkType(ctx, scope, 'String');
    const bool    = mkType(ctx, scope, 'bool');
    const f64     = mkType(ctx, scope, 'f64');
    const nothing = mkType(ctx, scope, 'nothing');
    const str     = mkType(ctx, scope, 'str');
    const u32     = mkType(ctx, scope, 'u32');

    mkFunc(ctx, scope, 'prefix!', bool, [bool]);
    mkFunc(ctx, scope, 'prefix-', u32, [u32]);

    mkFunc(ctx, scope, 'infix%', u32, [u32, u32]);
    mkFunc(ctx, scope, 'infix*', u32, [u32, u32]);
    mkFunc(ctx, scope, 'infix**', u32, [u32, u32]);
    mkFunc(ctx, scope, 'infix+', u32, [u32, u32]);
    mkFunc(ctx, scope, 'infix&', u32, [u32, u32]);
    mkFunc(ctx, scope, 'infix|', u32, [u32, u32]);
    mkFunc(ctx, scope, 'infix//', u32, [u32, u32]);
    mkFunc(ctx, scope, 'infix<<', u32, [u32, u32]);
    mkFunc(ctx, scope, 'infix>>', u32, [u32, u32]);
    mkFunc(ctx, scope, 'infix-', u32, [u32, u32]);
    mkFunc(ctx, scope, 'infix..', u32, [u32, u32]);
    mkFunc(ctx, scope, 'infix/', u32, [u32, u32]);

    mkFunc(ctx, scope, 'infix<', bool, [u32, u32]);
    mkFunc(ctx, scope, 'infix>', bool, [u32, u32]);
    mkFunc(ctx, scope, 'infix<=', bool, [u32, u32]);
    mkFunc(ctx, scope, 'infix>=', bool, [u32, u32]);
    mkFunc(ctx, scope, 'infix==', bool, [u32, u32]);
    mkFunc(ctx, scope, 'infix!=', bool, [u32, u32]);
    mkFunc(ctx, scope, 'infixor', bool, [bool, bool]);
    mkFunc(ctx, scope, 'infixand', bool, [bool, bool]);

    mkFunc(ctx, scope, 'print', nothing, [str]);

    return {
        count: ctx.nodes.length,
        List,
        // Math,
        // Num,
        //String,
        nothing,
        bool,
        f64,
        str,
        u32,

        scope,
    };
}

function mkFunc(ctx: Ctx, scope: Scope, name: string, returnType: LocalRef, parameters: LocalRef[]) {
    const ps = parameters.map((parameter, index) =>
        ctx.add(new Nodes.Variable(`_${index}`, parameter, VariableFlags.None))
    );

    const ref = ctx.add(new Nodes.Function(name, returnType, ps, [], true));
    scope.declare(name, ref.id, false);
    return ref;
}

function mkType(ctx: Ctx, scope: Scope, name: string): LocalRef {
    const ref = ctx.add(new Nodes.Struct(name, []));
    scope.declare(name, ref.id, false);
    return ref;
}

function mkConst(ctx: Ctx, scope: Scope, type: LocalRef, name: string, value: any): LocalRef {
    const ref = ctx.add(new Nodes.Constant(type, value));
    scope.declare(name, ref.id, false);
    return ref;
}