import * as Nodes from './ast/nodes';
import { Ctx } from './ast/context';
import { RefId, Scope, VariableFlags } from './ast/nodes';
import { MultiMapUtils } from './utils';

export type Builtins = ReturnType<typeof populateBuiltins>;

export function populateBuiltins(ctx: Ctx) {
    const scope = new Scope(null, new Map(), new Map());

    // const List    = mkType(ctx, scope, 'List');
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
        // List,
        // Math,
        // Num,
        //String,
        bool,
        f64,
        str,
        u32,

        scope,
    };
}

function mkFunc(ctx: Ctx, scope: Scope, name: string, returnType: RefId, parameters: RefId[]) {
    const ps = parameters.map((parameter, index) =>
        ctx.add(new Nodes.Variable(`_${index}`, parameter, VariableFlags.None))
    );

    const ref = ctx.add(new Nodes.Function(name, returnType, ps, [], true));
    scope.declare(name, ref.target);
    return ref;
}

function mkType(ctx: Ctx, scope: Scope, name: string): RefId {
    const ref = ctx.add(new Nodes.Struct(name, []));
    scope.declare(name, ref.target);
    return ref;
}

function mkConst(ctx: Ctx, scope: Scope, type: RefId, name: string, value: any): RefId {
    const ref = ctx.add(new Nodes.Constant(type, value));
    scope.declare(name, ref.target);
    return ref;
}