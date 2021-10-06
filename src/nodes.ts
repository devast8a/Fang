export type Node =
    | Module
    | Decl
    | Expr
    | Type
    | RefDecl
    ;

export type Decl =
    | DeclFunction
    | DeclStruct
    | DeclTrait
    | DeclVariable
    ;

export type Expr =
    | ExprCall
    | ExprConstant
    | ExprCreate
    | ExprDeclaration
    | ExprDestroy
    | ExprGet
    | ExprIf
    | ExprIfCase
    | ExprReturn
    | ExprSet
    | ExprWhile
    ;

export type Ref =
    | RefField
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
    ExprDeclaration,
    ExprDestroy,
    ExprGet,
    ExprIf,
    ExprIfCase,
    ExprReturn,
    ExprSet,
    ExprWhile,

    RefField,
    RefGlobal,
    RefGlobalMember,
    RefLocal,
    RefName,

    TypeGet,
    TypeInfer,
}

type RefDecl = Ref;
type RefExpr = number;

// Module ======================================================================

export class Module {
    public readonly tag = Tag.Module;
    public static readonly tag = Tag.Module;

    public constructor(
        public readonly children: Children,
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
        public readonly flags: DeclVariableFlags,
    ) { }
}

export enum DeclVariableFlags {
    None = 0,
    Mutable = 1 << 0,
    Owns = 1 << 1,
}

// Expressions =================================================================

export class ExprCall {
    public readonly tag = Tag.ExprConstant;
    public static readonly tag = Tag.ExprConstant;

    public constructor(
        public readonly ref: RefDecl,
        public readonly args: readonly RefExpr[],
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
        public readonly args: readonly RefExpr[],
    ) { }
}

export class ExprDeclaration {
    public readonly tag = Tag.ExprDeclaration;
    public static readonly tag = Tag.ExprDeclaration;

    public constructor(
        public readonly target: RefDecl,
    ) { }
}


export class ExprDestroy {
    public readonly tag = Tag.ExprDestroy;
    public static readonly tag = Tag.ExprDestroy;

    public constructor(
        public readonly target: RefDecl,
    ) { }
}

export class ExprGet {
    public readonly tag = Tag.ExprGet;
    public static readonly tag = Tag.ExprGet;

    public constructor(
        public readonly target: RefDecl,
    ) { }
}

export class ExprIf {
    public readonly tag = Tag.ExprIf;
    public static readonly tag = Tag.ExprIf;

    public constructor(
        public readonly cases: readonly RefExpr[],
    ) { }
}

export class ExprIfCase {
    public readonly tag = Tag.ExprIfCase;
    public static readonly tag = Tag.ExprIfCase;

    public constructor(
        public readonly condition: RefExpr | null,
        public readonly body: readonly RefExpr[],
    ) { }
}

export class ExprReturn {
    public readonly tag = Tag.ExprReturn;
    public static readonly tag = Tag.ExprReturn;

    public constructor(
        public readonly value: RefExpr | null,
    ) { }
}

export class ExprSet {
    public readonly tag = Tag.ExprSet;
    public static readonly tag = Tag.ExprSet;

    public constructor(
        public readonly target: RefDecl,
        public readonly value: RefExpr,
    ) { }
}

export class ExprWhile {
    public readonly tag = Tag.ExprWhile;
    public static readonly tag = Tag.ExprWhile;

    public constructor(
        public readonly condition: RefExpr,
        public readonly body: readonly RefExpr[],
    ) { }
}

// References ==================================================================

export class RefField {
    public readonly tag = Tag.RefField;
    public static readonly tag = Tag.RefField;

    public constructor(
        public readonly target: RefExpr,
        public readonly field: Ref,
    ) { }
}

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
        public readonly target: RefDecl,
    ) { }
}

export class TypeInfer {
    public readonly tag = Tag.TypeInfer;
    public static readonly tag = Tag.TypeInfer;
}

// Children ====================================================================

export class Children {
    public constructor(
        public readonly decl: readonly (Decl | RefDecl)[],
        public readonly expr: readonly Expr[],
        public readonly body: readonly number[],
        public readonly names: ReadonlyMap<string, readonly number[]>,
    ) { }
}

export class MutableChildren {
    public constructor(
        public readonly decl: (Decl | RefDecl)[],
        public readonly expr: Expr[],
        public readonly body: number[],
        public readonly names: Map<string, number[]>,
    ) { }
}
