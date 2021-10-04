import { Children, DeclFunction, DeclImport, DeclStruct, Module, RootId, TypeRefStatic } from './nodes';
import { Scope } from './stages/Scope';

const builtinModule = new Module();
const scope = new Scope();

function type(name: string) {
    const decl = new DeclStruct(RootId, name, new Children(), []);

    const id = builtinModule.nodes.length;
    builtinModule.nodes.push(decl);

    scope.declare(name, RootId, id + 1);

    return {
        id: id,
        reference: new TypeRefStatic(RootId, id + 1),
        declaration: decl,
    };
}

function func(name: string, returnType: ReturnType<typeof type>) {
    const decl = new DeclFunction(RootId, name, [], returnType.reference, [], 0);

    const id = builtinModule.nodes.length;
    builtinModule.nodes.push(decl);

    scope.declare(name, RootId, id);

    return {
        id: id,
        reference: new TypeRefStatic(RootId, id),
        declaration: decl,
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

const u64_plus = func("infix+", u64);

function importInto(target: Module) {
    if (target.nodes.length !== 0) {
        throw new Error("The compiler currently assumes that the builtin module is imported into id 0");
    }

    // Generate an import table
    const importTable = new DeclImport(RootId, ".builtin", builtinModule, []);

    target.nodes.push(importTable);

    for (const node of builtinModule.nodes) {
        const id = target.nodes.length;

        importTable.imports.push(id);
        target.nodes.push(node);
    }
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

    functions: {
        u64_plus,
    },

    scope: scope,
    module: builtinModule,
    importInto: importInto,
};