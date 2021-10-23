import { Constructor } from './common/constructor';

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

export type Ref<T extends Node = Node> =
    | RefFieldId<T>
    | RefFieldName<T>
    | RefGlobal<T>
    | RefGlobalDecl<T>
    | RefGlobalExpr<T>
    | RefLocal<T>
    | RefName<T>
    ;

export type RefLocalId<T extends Node = Node> = number;
export type RefAny<T extends Node = Node> = Ref<T> | RefLocalId<T>;

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

export type DeclId = number;
export type ExprId = number;
export type NodeId = number;

/** Deprecated */
export type _Global<T> = number;

// Module ======================================================================

export class Module {
    public readonly tag = Tag.Module;
    public static readonly tag = Tag.Module;

    public constructor(
        public readonly children: Children,
    ) { }
}

export class MutModule extends Module {
    public readonly tag = Tag.Module;
    public static readonly tag = Tag.Module;

    public constructor(
        public readonly children: MutChildren,
    ) {
        super(children);
    }
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
        public readonly value: RefLocalId | null,
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
        public readonly target: Ref<DeclFunction>,
        public readonly args: readonly RefLocalId[],
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
        public readonly args: readonly RefLocalId[],
    ) { }
}

export class ExprDeclaration {
    public readonly tag = Tag.ExprDeclaration;
    public static readonly tag = Tag.ExprDeclaration;

    public constructor(
        public readonly target: Ref<Decl>,
    ) { }
}


export class ExprDestroy {
    public readonly tag = Tag.ExprDestroy;
    public static readonly tag = Tag.ExprDestroy;

    public constructor(
        public readonly target: Ref<DeclVariable>,
    ) { }
}

export class ExprGet {
    public readonly tag = Tag.ExprGet;
    public static readonly tag = Tag.ExprGet;

    public constructor(
        public readonly target: Ref,
    ) { }
}

export class ExprIf {
    public readonly tag = Tag.ExprIf;
    public static readonly tag = Tag.ExprIf;

    public constructor(
        public readonly cases: readonly RefLocalId<ExprIfCase>[],
    ) { }
}

export class ExprIfCase {
    public readonly tag = Tag.ExprIfCase;
    public static readonly tag = Tag.ExprIfCase;

    public constructor(
        // TODO: Don't use null to signal else cases. It causes us to check for the null everywhere.
        public readonly condition: RefLocalId | null,
        public readonly body: readonly RefLocalId[],
    ) { }
}

export class ExprReturn {
    public readonly tag = Tag.ExprReturn;
    public static readonly tag = Tag.ExprReturn;

    public constructor(
        public readonly value: RefLocalId | null,
    ) { }
}

export class ExprSet {
    public readonly tag = Tag.ExprSet;
    public static readonly tag = Tag.ExprSet;

    public constructor(
        public readonly target: Ref,
        public readonly value: RefLocalId,
    ) { }
}

export class ExprWhile {
    public readonly tag = Tag.ExprWhile;
    public static readonly tag = Tag.ExprWhile;

    public constructor(
        public readonly condition: RefLocalId,
        public readonly body: readonly RefLocalId[],
    ) { }
}

// References ==================================================================

export class RefFieldId<T extends Node = Node> {
    public readonly tag = Tag.RefFieldId;
    public static readonly tag = Tag.RefFieldId;

    public constructor(
        public readonly target: RefLocalId,
        public readonly targetType: DeclId,
        public readonly field: DeclId,
    ) { }
}

export class RefFieldName<T extends Node = Node> {
    public readonly tag = Tag.RefFieldName;
    public static readonly tag = Tag.RefFieldName;

    public constructor(
        public readonly target: RefLocalId,
        public readonly field: string,
    ) { }
}

export class RefGlobal<T extends Node = Node> {
    public readonly tag = Tag.RefGlobal;
    public static readonly tag = Tag.RefGlobal;

    public constructor(
        public readonly id: DeclId,
    ) { }
}

export class RefGlobalDecl<T extends Node = Node> {
    public readonly tag = Tag.RefGlobalDecl;
    public static readonly tag = Tag.RefGlobalDecl;

    public constructor(
        public readonly id: DeclId,
        public readonly member: DeclId,
    ) { }
}

export class RefGlobalExpr<T extends Node = Node> {
    public readonly tag = Tag.RefGlobalExpr;
    public static readonly tag = Tag.RefGlobalExpr;

    public constructor(
        public readonly id: DeclId,
        public readonly member: ExprId,
    ) { }
}

export class RefLocal<T extends Node = Node> {
    public readonly tag = Tag.RefLocal;
    public static readonly tag = Tag.RefLocal;

    public constructor(
        public readonly id: DeclId,
    ) { }
}

export class RefName<T extends Node = Node> {
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
        public readonly target: Ref,
    ) { }
}

export class TypeInfer {
    public readonly tag = Tag.TypeInfer;
    public static readonly tag = Tag.TypeInfer;
}

// Children ====================================================================

export class Children {
    protected constructor(
        public readonly root:   Children,
        public readonly self:   RefGlobal<Decl>,
        public readonly parent: RefGlobal<Decl>,
        public readonly nodes:  ReadonlyArray<Node>,
        public readonly body:   ReadonlyArray<ExprId>,
        public readonly decls:  ReadonlyArray<DeclId>,
        public readonly names:  ReadonlyMap<string, readonly DeclId[]>,
    ) { }

    public get<T extends Node>(ref: RefAny<T>): T {
        if (typeof (ref) === 'number') {
            return this.nodes[ref] as T;
        }

        switch (ref.tag) {
            case Tag.RefGlobal: {
                return this.root.nodes[ref.id] as T;
            }

            case Tag.RefLocal: {
                return this.nodes[ref.id] as T;
            }

            case Tag.RefGlobalDecl: {
                if (ref.id === RootId) {
                    return this.root.nodes[ref.member] as T;
                }

                const parent = this.root.nodes[ref.id] as Decl;
                const children = Node.getChildren(parent);
                return children.nodes[ref.member] as T;
            }

            case Tag.RefFieldId: {
                const struct = this.root.nodes[ref.targetType] as Decl;
                const children = Node.getChildren(struct);
                const field = children.nodes[ref.field];

                // TODO: Remove nested lookups
                if (field.tag === Tag.ExprDeclaration) {
                    return this.get(field.target) as T;
                }

                return field as T;
            }
        }

        throw new Error(`Unreachable: Unhandled case '${Tag[(ref as any).tag]}'`);
    }
}

export class MutChildren extends Children {
    protected constructor(
        public readonly root:   MutChildren,
        public readonly self:   RefGlobal<Decl>,
        public readonly parent: RefGlobal<Decl>,
        public readonly nodes:  Array<Node>,
        public readonly body:   Array<ExprId>,
        public readonly decls:  Array<DeclId>,
        public readonly names:  Map<string, DeclId[]>,
    ) {
        super(root, self, parent, nodes, body, decls, names);
    }

    public add<T extends Node>(definition: NodeDefinition<T>): RefLocalId<T>
    {
        const nodes = this.nodes;

        const id = nodes.length;
        const ref = Ref.fromIndex(id);

        if (typeof (definition) === 'function') {
            nodes.push(null as any);
            nodes[id] = definition(ref);
        } else {
            nodes[id] = definition;
        }

        return ref;
    }

    public declare<T extends Decl>(ref: RefLocalId<T> | RefGlobalDecl<T>): RefLocalId<T> {
        const node = this.get(ref);

        if (Ref.isLocal(ref)) {
            this.decls.push(ref);
            this.names.set(node.name, [ref])

            return ref;
        }

        // Global reference to a local node
        if (ref.id === this.self.id) {
            const id = ref.member;

            this.decls.push(id);
            this.names.set(node.name, [id])

            return Ref.fromIndex(id);
        }

        // Truly global reference
        const decl = this.add(new ExprDeclaration(ref));

        this.decls.push(decl);
        this.names.set(node.name, [decl]);

        return decl;
    }

    public finalize(body: RefLocalId[]) {
        (this as any).body = body;
        return this as Children;
    }

    public static create(parent: MutChildren, self: RefLocalId) {
        return new MutChildren(
            parent.root,
            new RefGlobal(Ref.toIndex(self)),
            parent.self,
            [],
            [],
            [],
            new Map(),
        );
    }

    public static createAndSet(parent: MutChildren, self: RefLocalId, fields: Partial<MutChildren>) {
        return new MutChildren(
            parent.root,
            new RefGlobal(Ref.toIndex(self)),
            parent.self,
            fields.nodes ?? [],
            fields.body ?? [],
            fields.decls ?? [],
            fields.names ?? new Map(),
        );
    }

    public static createRoot() {
        const root = new MutChildren(
            undefined as any,
            new RefGlobal(RootId),
            new RefGlobal(RootId),
            [],
            [],
            [],
            new Map(),
        );

        (root as any).root = root;

        return root;
    }
}

export type NodeDefinition<T extends Node> =
    | ((id: RefLocalId) => T)
    | T;

// Context =====================================================================

// TODO: Support adding new nodes
export class Context {
    public constructor(
        public readonly errors: CompileError[],
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

    public get<T extends Node>(ref: RefAny<T>): T {
        if (typeof (ref) === 'number') {
            return this.container.nodes[ref] as T;
        }

        switch (ref.tag) {
            case Tag.RefGlobal: {
                return this.module.children.nodes[ref.id] as T;
            }

            case Tag.RefLocal: {
                return this.container.nodes[ref.id] as T;
            }

            case Tag.RefGlobalDecl: {
                if (ref.id === RootId) {
                    return this.module.children.nodes[ref.member] as T;
                }

                const parent = this.module.children.nodes[ref.id] as Decl;
                const children = Node.getChildren(parent);
                return children.nodes[ref.member] as T;
            }

            case Tag.RefFieldId: {
                const struct = this.module.children.nodes[ref.targetType] as Decl;
                const children = Node.getChildren(struct);
                const field = children.nodes[ref.field];

                // TODO: Remove nested lookups
                if (field.tag === Tag.ExprDeclaration) {
                    return this.get(field.target) as T;
                }

                return field as T;
            }
        }

        throw new Error(`Unreachable: Unhandled case '${Tag[(ref as any).tag]}'`);
    }
}

export class MutContext extends Context {
    public constructor(
        public readonly root: MutContext,
        public readonly errors: CompileError[],
        public readonly module: MutModule,
        public readonly container: MutChildren,
        public readonly parent: DeclId,
    ) {
        super(errors, module, container, parent);
    }

    public static fromContext(context: Context) {
        const root = new MutContext(
            null as any,
            context.errors,
            context.module as any,
            context.module.children as any,
            RootId
        );

        return new MutContext(
            root,
            context.errors,
            context.module as any,
            context.container as any,
            context.parent
        );
    }

    public createChildContext(container: MutChildren, parent: DeclId): MutContext {
        return new MutContext(
            this.root,
            this.errors,
            this.module,
            container,
            parent
        );
    }

    /* Mutable specific members */
    public _updateExpr(id: ExprId, expr: Expr) {
        this.container.nodes[id] = expr;
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
    export function getReturnType(context: Context, expr: Node): Type {
        switch (expr.tag) {
            case Tag.ExprCall:        return context.get(expr.target).returnType;
            case Tag.ExprConstant:    return expr.type;
            case Tag.ExprCreate:      return expr.type;
            case Tag.ExprGet:         return Node.as(context.get(expr.target), DeclVariable).type;
        }

        throw new Error(`Unreachable: Unhandled case '${Tag[(expr as any).tag]}'`);
    }

    export function idToRef(context: Context, id: ExprId) {
        return new RefGlobalExpr(context.parent, id);
    }
}

export namespace Type {
    export function canAssignTo(source: Type, target: Type): boolean {
        return false;
    }
}

export namespace Ref {
    export function isLocal<T extends Node>(ref: RefAny<T>): ref is RefLocalId<T> {
        return typeof (ref as any) === 'number';
    }

    export function fromIndex(id: number): RefLocalId {
        return (id as any) as RefLocalId;
    }

    export function toIndex(local: RefLocalId): number {
        return (local as any) as RefLocalId;
    }

    export function localToGlobal<T extends Node>(children: Children, ref: RefLocalId<T>): RefGlobalDecl<T> {
        return new RefGlobalDecl(
            children.self.id,
            Ref.toIndex(ref),
        );
    }
}