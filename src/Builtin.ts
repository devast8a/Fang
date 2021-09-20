import { DeclStruct, ExprConstant, TypeRefStatic, UnresolvedId } from './nodes';
import { Scope } from './stages/Scope';

function type(name: string) {
    return new DeclStruct(UnresolvedId, UnresolvedId, name, new Map(), new Set());
}

const empty = type("empty");

const bool  = type("bool");
const true_  = new ExprConstant(new TypeRefStatic(bool.id), true);
const false_ = new ExprConstant(new TypeRefStatic(bool.id), false);

const s8    = type("s8");
const s16   = type("s16");
const s32   = type("s32");
const s64   = type("s64");

const u8    = type("u8");
const u16   = type("u16");
const u32   = type("u32");
const u64   = type("u64");

const str   = type("str");

// Scope
const scope = new Scope();
scope.declare(empty.name, empty);

scope.declare(bool.name, bool);
// scope.declare("true", true_);
// scope.declare("false", false_);

scope.declare(s8.name , s8);
scope.declare(s16.name, s16);
scope.declare(s32.name, s32);
scope.declare(s64.name, s64);

scope.declare(u8.name , u8);
scope.declare(u16.name, u16);
scope.declare(u32.name, u32);
scope.declare(u64.name, u64);

export const builtin = {
    empty,

    bool,
    true: true_,
    false: false_,

    s8,
    s16,
    s32,
    s64,

    u8,
    u16,
    u32,
    u64,

    str,

    scope,
};