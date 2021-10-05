export type Node =
    | Module
    | Decl
    | Expr
    | Type
    | Ref<any>
    ;

export type Decl =
    | DeclFunction
    | DeclStruct
    | DeclTrait
    | DeclVariable
    ;

export type Expr =
    | ExprConstant
    | ExprCreate
    | ExprDestroy
    | ExprGet
    | ExprIf
    | ExprIfCase
    | ExprReturn
    | ExprSet
    | ExprWhile
    ;

export type Ref<T> =
    | RefGlobal
    | RefGlobalMember
    | RefLocal
    | RefName
    ;

export type Type =
    | TypeGet
    | TypeInfer
    ;

export enum Tag {
    Module,

    DeclFunction,
    DeclStruct,
    DeclTrait,
    DeclVariable,

    ExprConstant,
    ExprCreate,
    ExprDestroy,
    ExprGet,
    ExprIf,
    ExprIfCase,
    ExprReturn,
    ExprSet,
    ExprWhile,

    RefGlobal,
    RefGlobalMember,
    RefLocal,
    RefName,

    TypeGet,
    TypeInfer,
}

// Module ======================================================================

export class Module {
    public readonly tag = Tag.Module;
    public static readonly tag = Tag.Module;

    public constructor(
        public readonly children: Children,
    ) { }
}

export class Children {
    public constructor(
        public readonly decl: readonly (Decl | Ref<Decl>)[],
        public readonly expr: readonly Expr[],
        public readonly body: readonly number[],
        public readonly names: ReadonlyMap<string, readonly number[]>,
    ) { }
}

// Declarations ================================================================

export class DeclFunction {
    public readonly tag = Tag.DeclFunction;
    public static readonly tag = Tag.DeclFunction;

    public constructor(
        public readonly name: string,
        public readonly returnType: Type,
        public readonly parameters: number[],
        public readonly children: Children,
    ) { }
}

export class DeclStruct {
    public readonly tag = Tag.DeclStruct;
    public static readonly tag = Tag.DeclStruct;

    public constructor(
        public readonly name: string,
        public readonly superTypes: readonly Type[],
        public readonly children: Children,
    ) { }
}

export class DeclTrait {
    public readonly tag = Tag.DeclTrait;
    public static readonly tag = Tag.DeclTrait;

    public constructor(
        public readonly name: string,
        public readonly superTypes: readonly Type[],
        public readonly children: Children,
    ) { }
}

export class DeclVariable {
    public readonly tag = Tag.DeclVariable;
    public static readonly tag = Tag.DeclVariable;

    public constructor(
        public readonly name: string,
        public readonly type: Type,
    ) { }
}

// Expressions =================================================================

export class ExprCall {
    public readonly tag = Tag.ExprConstant;
    public static readonly tag = Tag.ExprConstant;

    public constructor(
        public readonly ref: Ref<Decl>,
        public readonly args: readonly Ref<Expr>[],
    ) { }
}

export class ExprConstant {
    public readonly tag = Tag.ExprConstant;
    public static readonly tag = Tag.ExprConstant;

    public constructor(
        public readonly type: Type,
        public readonly value: any,
    ) { }
}

export class ExprCreate {
    public readonly tag = Tag.ExprCreate;
    public static readonly tag = Tag.ExprCreate;

    public constructor(
        public readonly type: Type,
        public readonly args: readonly Ref<Expr>[],
    ) { }
}

export class ExprDestroy {
    public readonly tag = Tag.ExprDestroy;
    public static readonly tag = Tag.ExprDestroy;

    public constructor(
        public readonly target: Ref<Decl>,
    ) { }
}

export class ExprGet {
    public readonly tag = Tag.ExprGet;
    public static readonly tag = Tag.ExprGet;

    public constructor(
        public readonly target: Ref<Decl>,
    ) { }
}

export class ExprIf {
    public readonly tag = Tag.ExprIf;
    public static readonly tag = Tag.ExprIf;

    public constructor(
        public readonly cases: readonly Ref<ExprIfCase>[],
    ) { }
}

export class ExprIfCase {
    public readonly tag = Tag.ExprIfCase;
    public static readonly tag = Tag.ExprIfCase;

    public constructor(
        public readonly condition: Ref<Expr> | null,
        public readonly body: readonly Ref<Expr>[],
    ) { }
}

export class ExprReturn {
    public readonly tag = Tag.ExprReturn;
    public static readonly tag = Tag.ExprReturn;

    public constructor(
        public readonly value: Ref<Expr> | null,
    ) { }
}

export class ExprSet {
    public readonly tag = Tag.ExprSet;
    public static readonly tag = Tag.ExprSet;

    public constructor(
        public readonly target: Ref<Decl>,
        public readonly value: Ref<Expr>,
    ) { }
}

export class ExprWhile {
    public readonly tag = Tag.ExprWhile;
    public static readonly tag = Tag.ExprWhile;

    public constructor(
        public readonly condition: Ref<Expr>,
        public readonly body: readonly Ref<Expr>[],
    ) { }
}

// References ==================================================================

export class RefGlobal {
    public readonly tag = Tag.RefGlobal;
    public static readonly tag = Tag.RefGlobal;

    public constructor(
        public readonly id: number,
    ) { }
}

export class RefGlobalMember {
    public readonly tag = Tag.RefGlobalMember;
    public static readonly tag = Tag.RefGlobalMember;

    public constructor(
        public readonly id: number,
        public readonly member: number,
    ) { }
}

export class RefLocal {
    public readonly tag = Tag.RefLocal;
    public static readonly tag = Tag.RefLocal;

    public constructor(
        public readonly id: number,
    ) { }
}

export class RefName {
    public readonly tag = Tag.RefName;
    public static readonly tag = Tag.RefName;

    public constructor(
        public readonly name: string,
    ) { }
}

// Types =======================================================================

export class TypeGet {
    public readonly tag = Tag.TypeGet;
    public static readonly tag = Tag.TypeGet;

    public constructor(
        public readonly target: Ref<Decl>,
    ) { }
}

export class TypeInfer {
    public readonly tag = Tag.TypeInfer;
    public static readonly tag = Tag.TypeInfer;
}