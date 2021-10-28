import { Compiler } from '.';
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
    | DeclGenericParameter
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
    DeclGenericParameter,
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
        public readonly parameters: ReadonlyArray<RefLocalId<DeclVariable>>,
        public readonly children: Children,
        public readonly attributes: ReadonlyArray<RefLocalId>,
        public readonly flags: DeclFunctionFlags,
    ) { }
}
export enum DeclFunctionFlags {
    None     = 0,
    Abstract  = 1 << 0,
}

export class GenericData {
    public constructor(
        public readonly parameters: ReadonlyArray<RefLocalId<DeclGenericParameter>>,
    ) { }
}

export class DeclGenericParameter {
    public readonly tag = Tag.DeclGenericParameter;
    public static readonly tag = Tag.DeclGenericParameter;

    public constructor(
        public readonly name: string,
    ) { }
}

export class DeclStruct {
    public readonly tag = Tag.DeclStruct;
    public static readonly tag = Tag.DeclStruct;

    public constructor(
        public readonly name: string,

        public readonly superTypes: readonly Type[],
        public readonly children: Children,

        public readonly generics: GenericData | null,
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
    public constructor(
        public readonly parent: RefGlobal<Decl>,
        public readonly self:   RefGlobal<Decl>,
        public readonly nodes:  ReadonlyArray<Node>,
        public readonly body:   ReadonlyArray<ExprId>,
        public readonly decls:  ReadonlyArray<DeclId>,
        public readonly names:  ReadonlyMap<string, readonly DeclId[]>,
    ) { }
}

export class MutChildren extends Children {
    public constructor(
        public readonly parent: RefGlobal<Decl>,
        public readonly self:   RefGlobal<Decl>,
        public readonly nodes:  Array<Node>,
        public readonly body:   Array<ExprId>,
        public readonly decls:  Array<DeclId>,
        public readonly names:  Map<string, DeclId[]>,
    ) {
        super(parent, self, nodes, body, decls, names);
    }
}

export type NodeDefinition<T extends Node> =
    | ((id: RefLocalId) => T)
    | T;

// Context =====================================================================

export class Context {
    protected constructor(
        public readonly compiler: Compiler,
        public readonly root: Context,
        public readonly container: Children,

        /** @deprecated */ public readonly parent: DeclId,
        /** @deprecated */ public readonly module: Module,
    ) { }

    public error(error: CompileError) {
        this.compiler.error(error);
    }

    public get<T extends Node>(ref: RefAny<T>): T {
        if (typeof (ref) === 'number') {
            return this.container.nodes[ref] as T;
        }

        switch (ref.tag) {
            case Tag.RefGlobal: {
                return this.root.container.nodes[ref.id] as T;
            }

            case Tag.RefLocal: {
                return this.container.nodes[ref.id] as T;
            }

            case Tag.RefGlobalDecl: {
                if (ref.id === RootId) {
                    return this.root.container.nodes[ref.member] as T;
                }

                const parent = this.root.container.nodes[ref.id] as Decl;
                const children = Node.getChildren(parent);
                return children.nodes[ref.member] as T;
            }

            case Tag.RefFieldId: {
                const struct = this.root.container.nodes[ref.targetType] as Decl;
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

    public static fromModule(compiler: Compiler, module: Module) {
        const root = new Context(compiler, null as any, module.children, Ref.fromIndex(RootId), module);
        (root as any).root = root;
        return root;
    }

    /** @deprecated */
    public createChildContext(container: Children, id: DeclId) {
        return new Context(this.compiler, this.root, container, id, this.module);
    }
}

export class MutContext extends Context {
    protected constructor(
        public readonly compiler: Compiler,
        public readonly root: MutContext,
        public readonly container: MutChildren,

        /** @deprecated */ public readonly parent: DeclId,
        /** @deprecated */ public readonly module: MutModule,
    ) {
        super(compiler, root, container, parent, module);
    }

    public add<T extends Node>(definition: NodeDefinition<T>): RefLocalId<T>
    {
        const nodes = this.container.nodes;

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

    public update<T extends Node>(ref: RefLocalId<T>, node: T) {
        this.container.nodes[Ref.toIndex(ref)] = node;
    }

    public declare<T extends Decl>(ref: RefLocalId<T> | RefGlobalDecl<T>): RefLocalId<T> {
        const node = this.get(ref);

        if (Ref.isLocal(ref)) {
            this.container.decls.push(ref);
            this.container.names.set(node.name, [ref])

            return ref;
        }

        // Global reference to a local node
        if (ref.id === this.container.self.id) {
            const id = ref.member;

            this.container.decls.push(id);
            this.container.names.set(node.name, [id])

            return Ref.fromIndex(id);
        }

        // Truly global reference
        const decl = this.add(new ExprDeclaration(ref));

        this.container.decls.push(decl);
        this.container.names.set(node.name, [decl]);

        return decl;
    }

    public finalize(body: ReadonlyArray<RefLocalId>) {
        (this.container as any).body = body;
        return this.container as Children;
    }

    public static create(parent: MutContext, self: RefLocalId) {
        return this.createAndSet(parent, self, {});
    }

    public static createAndSet(parent: MutContext, self: RefLocalId, fields: Partial<MutChildren>) {
        const container = new MutChildren(
            parent.container.self,
            new RefGlobal(Ref.toIndex(self)),
            fields.nodes ?? [],
            fields.body ?? [],
            fields.decls ?? [],
            fields.names ?? new Map(),
        );

        return new MutContext(parent.compiler, parent.root, container, Ref.toIndex(self), parent.module);
    }

    public static createRoot(compiler: Compiler) {
        const container = new MutChildren(
            new RefGlobal(RootId),
            new RefGlobal(RootId),
            [],
            [],
            [],
            new Map(),
        );

        const module = new MutModule(
            container
        );

        return MutContext.fromModule(compiler, module);
    }

    public static fromModule(compiler: Compiler, module: MutModule) {
        const root = new MutContext(compiler, undefined as any, module.children, Ref.fromIndex(RootId), module);
        (root as any).root = root;
        return root;
    }

    /** @deprecated */
    public static fromContext(context: Context) {
        const root = MutContext.fromModule(context.compiler, context.module as MutModule);
        return new MutContext(context.compiler, root, context.container as MutChildren, context.parent, context.module as MutModule);
    }
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
            case Tag.DeclGenericParameter:
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

    export function localToGlobal<T extends Node>(context: Context, ref: RefLocalId<T>): RefGlobalDecl<T> {
        return new RefGlobalDecl(
            context.container.self.id,
            Ref.toIndex(ref),
        );
    }
}

export namespace Type {
    export function canAssignTo(context: Context, source: Type, target: Type): boolean {
        return Type.isChildType(context, source, target);
    }

    export function isChildType(context: Context, child: Type, parent: Type): boolean {
        const childDecl = context.get((child as TypeGet).target);
        const parentDecl = context.get((parent as TypeGet).target);

        if (childDecl === parentDecl) {
            return true;
        }

        switch (childDecl.tag) {
            case Tag.DeclFunction: throw new Error('Not implemented yet');
            case Tag.DeclStruct: return childDecl.superTypes.some(child => isChildType(context, child, parent));
            case Tag.DeclTrait: return false;
        }

        throw new Error(`Unreachable: Unhandled case '${Tag[(child as any).tag]}'`);
    }
}
