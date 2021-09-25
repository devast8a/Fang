import { DeclStruct, TypeRefDecl, UnresolvedId } from './nodes';
import { Scope } from './stages/Scope';

const scope = new Scope();

function type(name: string) {
    const struct = new DeclStruct(UnresolvedId, name, new Map(), new Set());
    const ref    = new TypeRefDecl(struct);
    // TODO: declare should take a Type too.
    // scope.declare(name, ref as any);
    return ref;
}

const empty = type("empty");

const bool  = type("bool");
// const true_  = new ExprConstant(bool, true);
// const false_ = new ExprConstant(bool, false);

const s8    = type("s8");
const s16   = type("s16");
const s32   = type("s32");
const s64   = type("s64");

const u8    = type("u8");
const u16   = type("u16");
const u32   = type("u32");
const u64   = type("u64");

const str   = type("str");

export const builtin = {
    empty,

    bool,
    // true: true_,
    // false: false_,

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