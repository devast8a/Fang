import { DeclImport, DeclStruct, Module, RootId, TypeRefStatic } from './nodes';
import { Scope } from './stages/Scope';

const builtinModule = new Module();
const scope = new Scope();
const importTable = new DeclImport(RootId, "FM_builtin", [], []);

const ImportId = 0;

function type(name: string) {
    const struct = new DeclStruct(RootId, name, new Map(), new Set());

    const id = builtinModule.nodes.length;
    builtinModule.nodes.push(struct);
    importTable.symbols.push(name);
    importTable.references.push(struct);

    scope.declare(name, ImportId, id);

    return {
        id: id,
        reference: new TypeRefStatic(ImportId, id),
        declaration: struct,
    };
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

function importInto(module: Module) {
    if (module.nodes.length !== 0) {
        throw new Error("The compiler currently assumes that the builtin module is imported into id 0");
    }

    module.nodes.push(importTable);
}

export const builtin = {
    references: {
        empty: empty.reference,

        bool: bool.reference,

        s8: s8.reference,
        s16: s16.reference,
        s32: s32.reference,
        s64: s64.reference,

        u8: u8.reference,
        u16: u16.reference,
        u32: u32.reference,
        u64: u64.reference,

        str: str.reference,
    },

    declarations: {
        empty: empty.declaration,

        bool: bool.declaration,

        s8: s8.declaration,
        s16: s16.declaration,
        s32: s32.declaration,
        s64: s64.declaration,

        u8: u8.declaration,
        u16: u16.declaration,
        u32: u32.declaration,
        u64: u64.declaration,

        str: str.declaration,
    },

    scope: scope,
    module: builtinModule,
    importInto: importInto,
};