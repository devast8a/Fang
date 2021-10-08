import { Constructor } from './common/constructor';

export type Node =
    | Module
    | Decl
    | Expr
    | Type
    | Ref
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
    | RefFieldId
    | RefFieldName
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

    ExprCall,
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

    RefFieldId,
    RefFieldName,
    RefGlobal,
    RefGlobalMember,
    RefLocal,
    RefName,

    TypeGet,
    TypeInfer,
}

export const RootId = -1;
export const BadId = -2;

// These aliases are intended to ease refactoring rather than hide implementation details.
export type RefDecl = Ref;
export type RefExpr = number;
export type ExprId = number;
export type DeclId = number;

export type NodeType<T> = Constructor<T> & { tag: Tag };

// Module ======================================================================

export class Module {
    public readonly tag = Tag.Module;
    public static readonly tag = Tag.Module;

    public constructor(
        public readonly children: Children,
    ) { }
}

export class MutModule {
    public readonly tag = Tag.Module;
    public static readonly tag = Tag.Module;

    public constructor(
        public readonly children: MutChildren,
    ) { }
}

// Declarations ================================================================

export class DeclFunction {
    public readonly tag = Tag.DeclFunction;
    public static readonly tag = Tag.DeclFunction;

    public constructor(
        public readonly name: string,
        public readonly returnType: Type,
        public readonly parameters: DeclId[],
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
        public readonly value: RefExpr | null,
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
    public readonly tag = Tag.ExprCall;
    public static readonly tag = Tag.ExprCall;

    public constructor(
        public readonly target: RefDecl,
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

export class RefFieldId {
    public readonly tag = Tag.RefFieldId;
    public static readonly tag = Tag.RefFieldId;

    public constructor(
        public readonly target: RefExpr,
        public readonly field: DeclId,
    ) { }
}

export class RefFieldName {
    public readonly tag = Tag.RefFieldName;
    public static readonly tag = Tag.RefFieldName;

    public constructor(
        public readonly target: RefExpr,
        public readonly field: string,
    ) { }
}

export class RefGlobal {
    public readonly tag = Tag.RefGlobal;
    public static readonly tag = Tag.RefGlobal;

    public constructor(
        public readonly id: DeclId,
    ) { }
}

export class RefGlobalMember {
    public readonly tag = Tag.RefGlobalMember;
    public static readonly tag = Tag.RefGlobalMember;

    public constructor(
        public readonly id: DeclId,
        public readonly member: DeclId,
    ) { }
}

export class RefLocal {
    public readonly tag = Tag.RefLocal;
    public static readonly tag = Tag.RefLocal;

    public constructor(
        public readonly id: DeclId,
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
        public readonly decls: readonly (Decl | RefDecl)[],
        public readonly exprs: readonly Expr[],
        public readonly body: readonly ExprId[],
        public readonly names: ReadonlyMap<string, readonly DeclId[]>,
    ) { }
}

export class MutChildren {
    public constructor(
        public readonly decls: (Decl | RefDecl)[],
        public readonly exprs: Expr[],
        public readonly body: ExprId[],
        public readonly names: Map<string, DeclId[]>,
    ) { }
}

// Context =====================================================================

export class Context {
    public constructor(
        public readonly module: Module,
        public readonly container: Children,
        public readonly parent: DeclId,
    ) { }

    public createChildContext(container: Children, parent: DeclId) {
        return new Context(this.module, container, parent);
    }
}

export class MutContext {
    public constructor(
        public readonly module: MutModule,
        public readonly container: MutChildren,
        public readonly parent: DeclId,
    ) { }

    public static fromContext(context: Context) {
        return new MutContext(context.module as any, context.container as any, context.parent);
    }

    public createChildContext(container: MutChildren, parent: DeclId): MutContext {
        return new MutContext(this.module, container, parent);
    }

    public updateExpr(id: ExprId, expr: Expr) {
        this.container.exprs[id] = expr;
    }
}

// Utilities ===================================================================

export namespace Node {
    export function as<T>(node: Node, type: NodeType<T>): T {
        if (node.tag === type.tag) {
            return node as any;
        }

        throw new Error(`Expected node of type '${Tag[type.tag]}' but got node of type '${Tag[node.tag]}'`);
    }

    export function getChildren(decl: Decl | Ref) {
        if (!Node.hasChildren(decl)) {
            throw new Error(`Unexpected node of type '${Tag[decl.tag]}', expected a node that has children.`);
        }

        return decl.children;
    }

    type HasChildren = Module | DeclFunction | DeclStruct | DeclTrait;
    export function hasChildren(node: Node): node is HasChildren {
        switch (node.tag) {
            case Tag.DeclVariable:
            case Tag.ExprCall:
            case Tag.ExprConstant:
            case Tag.ExprCreate:
            case Tag.ExprDeclaration:
            case Tag.ExprDestroy:
            case Tag.ExprGet:
            case Tag.ExprIf:
            case Tag.ExprIfCase:
            case Tag.ExprReturn:
            case Tag.ExprSet:
            case Tag.ExprWhile:
            case Tag.RefFieldName:
            case Tag.RefGlobal:
            case Tag.RefGlobalMember:
            case Tag.RefLocal:
            case Tag.RefName:
            case Tag.TypeGet:
            case Tag.TypeInfer:
                return false;

            case Tag.Module:
            case Tag.DeclFunction:
            case Tag.DeclStruct:
            case Tag.DeclTrait:
                return true;
        }

        throw new Error(`Unreachable: Unhandled case '${Tag[(node as any)?.tag]}'`);
    }

    export function mutate<T extends Node>(node: T, fields: Partial<T>): T {
        // TODO: Implement a clone function
        return Object.assign({}, node, fields);
    }
}

export namespace Decl {
}

export namespace Expr {
    export function get(context: Context, id: ExprId) {
        return context.container.exprs[id];
    }

    export function getReturnType(context: Context, expr: Expr): Type {
        switch (expr.tag) {
            case Tag.ExprCall:        return Node.as(Ref.resolve(context, expr.target), DeclFunction).returnType;
            case Tag.ExprConstant:    return expr.type;
            case Tag.ExprCreate:      return expr.type;
            case Tag.ExprGet:         return Node.as(Ref.resolve(context, expr.target), DeclVariable).type;
        }

        throw new Error(`Unreachable: Unhandled case '${Tag[(expr as any).tag]}'`);
    }
}

export namespace Ref {
    export function resolve(context: Context, ref: Ref): Decl {
        switch (ref.tag) {
            //case Tag.RefFieldId:        return ;
            case Tag.RefGlobal:         return context.module.children.decls[ref.id] as Decl;
            case Tag.RefGlobalMember:   return Node.getChildren(context.module.children.decls[ref.id]).decls[ref.member] as Decl;
            case Tag.RefLocal:          return context.container.decls[ref.id] as Decl;

            case Tag.RefFieldName:
            case Tag.RefName: {
                throw new Error(`'${Tag[ref.tag]}' can not be handled by Ref.resolve. Instead it must be resolved by resolveNames first.`);
            }
        }

        throw new Error(`Unreachable: Unhandled case '${Tag[(ref as any).tag]}'`);
    }
}