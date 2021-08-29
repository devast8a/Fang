import { Class, ExprConstant } from './nodes';
import { Scope } from './stages/Scope';

const empty = new Class("empty", [], new Set());

const bool  = new Class("bool", [], new Set());
const true_  = new ExprConstant(bool, true);
const false_ = new ExprConstant(bool, false);

const s8    = new Class("s8", [], new Set());
const s16   = new Class("s16", [], new Set());
const s32   = new Class("s32", [], new Set());
const s64   = new Class("s64", [], new Set());

const u8    = new Class("u8", [], new Set());
const u16   = new Class("u16", [], new Set());
const u32   = new Class("u32", [], new Set());
const u64   = new Class("u64", [], new Set());

const str   = new Class("str", [], new Set());

// Scope
const scope = new Scope();
scope.declare(empty.name, empty);

scope.declare(bool.name, bool);
scope.declare("true", true_);
scope.declare("false", false_);

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