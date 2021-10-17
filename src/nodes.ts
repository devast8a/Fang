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
    | RefGlobalDecl
    | RefGlobalExpr
    | RefLocal
    | RefName
    ;

export type Type =
    | TypeGenericApply
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
    RefGlobalDecl,
    RefGlobalExpr,
    RefLocal,
    RefName,

    TypeGenericApply,
    TypeGet,
    TypeInfer,
}

export const RootId = -1;
export const BadId = -2;

export type NodeType<T> = Constructor<T> & { tag: Tag };

/*
    These aliases are intended to ease refactoring and improve readability rather than hide implementation details.

    DeclId, ExprId, NodeId
    - These identify Decl, Expr, and Nodes for a particular instance of Context.
    - Only use NodeId if you don't know if the id refers to a Decl or an Expr.
    - Prefer to use these throughout the compiler over Ref, but don't store them or pass them around in a way that the
        context could change and make the identifier invalid.
    - Avoid these as a field of a Node and instead use RefDecl and RefExpr instead. The only exception to this is if the Node has
        children and the target is always one of those children (DeclFunction's parameters for example).

    RefDecl, RefExpr
    - These identify Decl and Expr within a particular module and are not sensitive to the context.
    - Prefer to use these as 
    - Avoid these throughout the compiler and instead use DeclId, ExprId, NodeId.
*/
export type DeclId = number;
export type ExprId = number;
export type NodeId = number;

export type RefDecl = Ref;
export type RefExpr = number;

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
        public readonly parameters: DeclId[],   // Indexes into children.decls
        public readonly children: Children,
        public readonly flags: DeclFunctionFlags,
    ) { }
}
export enum DeclFunctionFlags {
    None     = 0,
    Abstract  = 1 << 0,
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
    None    = 0,
    Mutable = 1 << 0,
    Owns    = 1 << 1,
}

// Expressions =================================================================

export class ExprCall {
    public readonly tag = Tag.ExprCall;
    public static readonly tag = Tag.ExprCall;

    public constructor(
        public readonly target: RefDecl,
        public readonly args: readonly RefExpr[],
        public readonly compileTime: boolean,
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
        // TODO: Don't use null to signal else cases. It causes us to check for the null everywhere.
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

export class RefGlobalDecl {
    public readonly tag = Tag.RefGlobalDecl;
    public static readonly tag = Tag.RefGlobalDecl;

    public constructor(
        public readonly id: DeclId,
        public readonly member: DeclId,
    ) { }
}

export class RefGlobalExpr {
    public readonly tag = Tag.RefGlobalExpr;
    public static readonly tag = Tag.RefGlobalExpr;

    public constructor(
        public readonly id: DeclId,
        public readonly member: ExprId,
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

export class TypeGenericApply {
    public readonly tag = Tag.TypeGenericApply;
    public static readonly tag = Tag.TypeGenericApply;

    public constructor(
        public readonly target: Type,
        public readonly args: ReadonlyArray<Type>,
    ) { }
}

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
        public readonly nodes: readonly Node[],
        public readonly body: readonly ExprId[],
        public readonly decls: readonly DeclId[],
        public readonly names: ReadonlyMap<string, readonly DeclId[]>,
    ) { }
}

export class MutChildren {
    public constructor(
        public readonly nodes: Node[],
        public readonly body: ExprId[],
        public readonly decls: DeclId[],
        public readonly names: Map<string, DeclId[]>,
    ) { }
}

// Context =====================================================================

// TODO: Support adding new nodes
export class Context {
    public constructor(
        public errors: CompileError[],
        public readonly module: Module,
        public readonly container: Children,
        public readonly parent: DeclId,
    ) { }

    public createChildContext(container: Children, parent: DeclId) {
        return new Context(this.errors, this.module, container, parent);
    }

    public error(error: CompileError) {
        this.errors.push(error);
    }
}

export class MutContext {
    public constructor(
        public errors: CompileError[],
        public readonly module: MutModule,
        public readonly container: MutChildren,
        public readonly parent: DeclId,
    ) { }

    public static fromContext(context: Context) {
        return new MutContext(context.errors, context.module as any, context.container as any, context.parent);
    }

    public createChildContext(container: MutChildren, parent: DeclId): MutContext {
        return new MutContext(this.errors, this.module, container, parent);
    }

    public error(error: CompileError) {
        this.errors.push(error);
    }

    /* Mutable specific members */
    public _updateExpr(id: ExprId, expr: Expr) {
        this.container.nodes[id] = expr;
    }

    public _declareGlobalDecl(decl: Decl): Ref {
        throw new Error();
    }

    public define(storage: Storage, definition: (id: NodeId) => Node): NodeId {
        if (storage === Storage.Parent || this.container === this.module.children) {
            // Allocate in parent
            const { nodes } = this.container;
            const id = nodes.length;
            nodes.push(null as any);
            const node = nodes[id] = definition(id);

            // Declare in parent
            const name = Node.getName(node);
            if (name !== undefined) {
                const { decls, names } = this.container;
                decls.push(id);
                names.set(name, [id]);
            }

            return id;
        } else {
            // Allocate in module
            const moduleNodes = this.module.children.nodes;
            const id = moduleNodes.length;
            moduleNodes.push(null as any);
            const node = moduleNodes[id] = definition(id);

            // Allocate ExprDeclaration in parent
            const { nodes } = this.container;
            const localId = nodes.length;
            nodes.push(new ExprDeclaration(new RefGlobal(id)));

            // Declare in parent
            const name = Node.getName(node);
            if (name !== undefined) {
                const { decls, names } = this.container;
                decls.push(localId);
                names.set(name, [localId]);
            }

            return localId;
        }
    }

    public createChildContext2(parent: DeclId): MutContext {
        return new MutContext(this.errors, this.module, new MutChildren([], [], [], new Map()), parent);
    }
    public finalize(body: NodeId[]) {
        return new Children(this.container.nodes, body, this.container.decls, this.container.names);
    }

    /* Finalize */
}

export enum Storage {
    Parent,
    Module,
}

export interface CompileError {
    // TODO: Define the interface
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

    export function getName(node: Node): string | undefined {
        return (node as any).name;
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
            case Tag.RefGlobalDecl:
            case Tag.RefLocal:
            case Tag.RefName:
            case Tag.TypeGenericApply:
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
    export function idToRef(context: Context, id: DeclId) {
        return new RefGlobalDecl(context.parent, id);
    }
}

export namespace Expr {
    export function get(context: Context, id: ExprId) {
        return context.container.nodes[id] as Expr;
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

    export function idToRef(context: Context, id: ExprId) {
        return new RefGlobalExpr(context.parent, id);
    }
}

export namespace Ref {
    export function resolve(context: Context, ref: Ref): Decl {
        switch (ref.tag) {
            case Tag.RefGlobal: return context.module.children.nodes[ref.id] as Decl;
        }

        throw new Error(`Unreachable: Unhandled case '${Tag[(ref as any).tag]}'`);
    }
}

export namespace Type {
    export function canAssignTo(source: Type, target: Type): boolean {
        return false;
    }
}