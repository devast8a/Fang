import { Constructor } from './common/constructor';
import { Compiler } from './compile';

export type Node =
    | Decl
    | Expr
    | Type
    | Module            // [Top level of a compilation unit]
    ;

export type Decl =
    | DeclFunction      // fn name(parameters...) -> returnType { body... }
    | DeclImport
    | DeclImportSymbol
    | DeclStruct        // class name { members... }
    | DeclSymbol        // Any symbol
    | DeclTrait         // trait name { members... }
    | DeclVariable      // val name: Type = Expr
    ;

export type Expr =
    | ExprArgument      // name: expression
    | ExprCall          // <target>(arguments...)           [resolves to ExprCallField, ExprCallStatic]
    | ExprCallField     // object.field(arguments...)
    | ExprCallStatic    // target(arguments...)
    | ExprConstant      // [Any constant value]
    | ExprConstruct     // T{}
    | ExprDeclaration   // [Marks position of a Decl]
    | ExprGetField      // expression.field                 [as r-value]
    | ExprGetLocal      // local                            [as r-value]
    | ExprMacroCall     // macro! argument
    | ExprRefName       // identifier                       [resolves to ExprRefStatic]
    | ExprRefStatic     // identifier                       [global reference]
    | ExprSetField      // Expr.field = expression
    | ExprSetLocal      // local = expression
    | ExprDestroyField  // delete! expression.field
    | ExprDestroyLocal  // delete! variable
    | ExprIf            // if (condition) { ... } else if (condition) { ... } else { ... }
    | ExprIfBranch      // if (condition) { ... }` or `else if (condition) { ... }
    | ExprReturn        // return expression
    | ExprWhile         // while (condition) { ... }
    ;

export type Type =
    | TypeInfer         // [Infer this type. Not valid everywhere]
    | TypeRefDecl       // [References a Decl directly]
    | TypeRefName       // identifier                       [resolves to TypeRefStatic]
    | TypeRefStatic     // identifier                       [global reference in type context]
    ;

export enum Tag {
    Module,
    DeclFunction,
    DeclImport,
    DeclImportSymbol,
    DeclStruct,
    DeclSymbol,
    DeclTrait,
    DeclVariable,
    ExprArgument,
    ExprCall,
    ExprCallField,
    ExprCallStatic,
    ExprConstant,
    ExprConstruct,
    ExprDeclaration,
    ExprDestroyField,
    ExprDestroyLocal,
    ExprGetField,
    ExprGetLocal,
    ExprIf,
    ExprIfBranch,
    ExprMacroCall,
    ExprRefName,
    ExprRefStatic,
    ExprReturn,
    ExprSetField,
    ExprSetLocal,
    ExprWhile,
    TypeInfer,
    TypeRefDecl,
    TypeRefName,
    TypeRefStatic,
}

// -------------------------------------------------------------------------

export class Module {
    public readonly tag = Tag.Module;
    public static readonly tag = Tag.Module;

    public readonly nodes = new Array<Decl>();
}

export class DeclFunction {
    public readonly tag = Tag.DeclFunction;
    public static readonly tag = Tag.DeclFunction;

    public variables = new Array<DeclVariable>();

    public constructor(
        public parent: number,

        public name: string,
        public parameters: Array<DeclVariable>,
        public returnType: Type,
        public body: Array<Expr>,
        public flags: FunctionFlags,
    ) {}
}

export enum FunctionFlags {
    None        = 0,
    Abstract    = 1 << 1,
}

export class DeclImport {
    public readonly tag = Tag.DeclImport;
    public static readonly tag = Tag.DeclImport;

    public constructor(
        public parent: number,

        public name: string,

        public module: Module,
        public imports: Global[],
    ) {}
}

export class DeclImportSymbol {
    public readonly tag = Tag.DeclImportSymbol;
    public static readonly tag = Tag.DeclImportSymbol;

    public constructor(
        public parent: number,

        public name: string,

        public declaration: Global,
        public member: Global,
    ) {}
}

export class Children {
    public nodes = new Array<ExprDeclaration | DeclVariable>();
    public names = new Map<string, number[]>();
}

export class DeclStruct {
    public readonly tag = Tag.DeclStruct;
    public static readonly tag = Tag.DeclStruct;

    public constructor(
        public parent: number,

        public name: string,
        public children: Children,
        public superTypes: Set<Type>,
    ) {}
}

export class DeclSymbol {
    public readonly tag = Tag.DeclSymbol;
    public static readonly tag = Tag.DeclSymbol;

    public readonly nodes = new Array<Global>();

    public constructor(
        public parent: number,

        public name: string,
    ) {}
}

export class DeclTrait {
    public readonly tag = Tag.DeclTrait;
    public static readonly tag = Tag.DeclTrait;

    public constructor(
        public parent: number,

        public name: string,
        public members: Map<string, Global>,
        public superTypes: Set<Type>,
    ) {}
}

// TODO: Decide if we split into local/field/global? -or- if we use VariableFlags to indicate this
export class DeclVariable {
    public readonly tag = Tag.DeclVariable;
    public static readonly tag = Tag.DeclVariable;

    public constructor(
        public parent: number,

        public name: string,
        public type: Type,
        public value: Expr | null,
        public flags: VariableFlags,
    ) {}
}

export enum VariableFlags {
    None    = 0,
    Local   = 1 << 0,
    Mutates = 1 << 1,
    Owns    = 1 << 2,
}

/** Named Argument for ExprCall and ExprConstruct */
export class ExprArgument {
    public readonly tag = Tag.ExprArgument;
    public static readonly tag = Tag.ExprArgument;

    public constructor(
        public name: string,
        public value: Expr,
    ) {}
}

export class ExprCall {
    public readonly tag = Tag.ExprCall;
    public static readonly tag = Tag.ExprCall;

    public constructor(
        public target: Expr,
        public args: Array<Expr>,
    ) {}
}

export class ExprCallField {
    public readonly tag = Tag.ExprCallField;
    public static readonly tag = Tag.ExprCallField;

    public constructor(
        public object: Expr,
        public field: Field,
        public args: Array<Expr>,
    ) {}
}

export class ExprCallStatic {
    public readonly tag = Tag.ExprCallStatic;
    public static readonly tag = Tag.ExprCallStatic;

    public constructor(
        public target: Global,
        public args: Array<Expr>,
    ) {}
}

export class ExprConstruct {
    public readonly tag = Tag.ExprConstruct;
    public static readonly tag = Tag.ExprConstruct;

    public constructor(
        public target: Type,
        public args: Array<Expr>,
    ) {}
}

export class ExprConstant {
    public readonly tag = Tag.ExprConstant;
    public static readonly tag = Tag.ExprConstant;

    public constructor(
        public type: Type,
        public value: any,
    ) {}
}

export class ExprDeclaration {
    public readonly tag = Tag.ExprDeclaration;
    public static readonly tag = Tag.ExprDeclaration;

    public constructor(
        public declaration: number,
        public member: number,
    ) {}
}

export class ExprGetField {
    public readonly tag = Tag.ExprGetField;
    public static readonly tag = Tag.ExprGetField;

    public constructor(
        public object: Expr,
        public field: Field,
    ) {}
}

export class ExprGetLocal {
    public readonly tag = Tag.ExprGetLocal;
    public static readonly tag = Tag.ExprGetLocal;
    
    public constructor(
        public local: Local,
    ) {}
}

export class ExprMacroCall {
    public readonly tag = Tag.ExprMacroCall;
    public static readonly tag = Tag.ExprMacroCall;

    public constructor(
        public target: string,
        public args: Expr[],
    ) {}
}

export class ExprSetField {
    public readonly tag = Tag.ExprSetField;
    public static readonly tag = Tag.ExprSetField;

    public constructor(
        public object: Expr,
        public field: Field,
        public value: Expr,
    ) {}
}

export class ExprSetLocal {
    public readonly tag = Tag.ExprSetLocal;
    public static readonly tag = Tag.ExprSetLocal;

    public constructor(
        public local: Local,
        public value: Expr,
    ) {}
}

export class ExprDestroyField {
    public readonly tag = Tag.ExprDestroyField;
    public static readonly tag = Tag.ExprDestroyField;

    public constructor(
        public object: Expr,
        public field: Field,
    ) {}
}

export class ExprDestroyLocal {
    public readonly tag = Tag.ExprDestroyLocal;
    public static readonly tag = Tag.ExprDestroyLocal;

    public constructor(
        public local: Local,
    ) {}
}

export class ExprIf {
    public readonly tag = Tag.ExprIf;
    public static readonly tag = Tag.ExprIf;

    public constructor(
        public branches: Array<ExprIfBranch>,
        public elseBranch: Array<Expr>,
    ) {}
}

export class ExprIfBranch {
    public readonly tag = Tag.ExprIfBranch;
    public static readonly tag = Tag.ExprIfBranch;

    public constructor(
        public condition: Expr,
        public body: Array<Expr>,
    ) {}
}

export class ExprRefStatic {
    public readonly tag = Tag.ExprRefStatic;
    public static readonly tag = Tag.ExprRefStatic;

    public constructor(
        public declaration: Global,
        public member: Global,
    ) {}
}

export class ExprRefName {
    public readonly tag = Tag.ExprRefName;
    public static readonly tag = Tag.ExprRefName;

    public constructor(
        public name: string,
    ) {}
}

export class ExprReturn {
    public readonly tag = Tag.ExprReturn;
    public static readonly tag = Tag.ExprReturn;

    public constructor(
        public expression: Expr | null,
    ) {}
}

export class ExprWhile {
    public readonly tag = Tag.ExprWhile;
    public static readonly tag = Tag.ExprWhile;

    public constructor(
        public condition: Expr,
        public body: Array<Expr>
    ) {}
}

export class TypeInfer {
    public readonly tag = Tag.TypeInfer;
    public static readonly tag = Tag.TypeInfer;
}

export class TypeRefDecl {
    public readonly tag = Tag.TypeRefDecl;
    public static readonly tag = Tag.TypeRefDecl;

    public constructor(
        public declaration: Decl,
    ) {}
}

export class TypeRefStatic {
    public readonly tag = Tag.TypeRefStatic;
    public static readonly tag = Tag.TypeRefStatic;

    public constructor(
        public declaration: Global,
        public member: Global,
    ) {}
}

export class TypeRefName {
    public readonly tag = Tag.TypeRefName;
    public static readonly tag = Tag.TypeRefName;

    public constructor(
        public name: string,
    ) {}
}

// -------------------------------------------------------------------------

// References
//  Remove concept of global/field/local?
//  All references are two indexes. Parent / Field?
type Global = number;
type Field  = string | number;
type Local  = number;

export type NodeConstructor<T extends Node = Node> = Constructor<T> & {tag: Tag};

export namespace Type {
    export function canAssignTo(context: Context, child: Type | Decl, parent: Type | Decl) {
        return Type.isSubType(context, child, parent);
    }

    export function isSubType(context: Context, child: Type | Decl, parent: Type | Decl): boolean {
        switch (parent.tag) {
            case Tag.DeclStruct:    break;
            case Tag.TypeRefStatic: return isSubType(context, child, context.resolve(parent));
            default: throw new Error(`isSubType: Has no handler for parent node '${Tag[parent.tag]}'`);
        }

        switch (child.tag) {
            case Tag.DeclStruct: return child === parent;
            case Tag.TypeRefStatic: return isSubType(context, context.resolve(child), parent);
            default: throw new Error(`isSubType: Has no handler for child node '${Tag[child.tag]}'`);
        }
    }

    export function getMember(type: Type, member: string): Decl {
        // switch (type.tag) {
        //     case Tag.DeclStruct:       return type.members.get(member);
        //     case Tag.DeclFunction:    return undefined;
        //     case Tag.DeclTrait:       throw new Error('Not implemented yet');
        //     case Tag.TypeRefName: throw new Error('Not implemented yet');
        //     case Tag.TypeInfer:   throw new Error('Not implemented yet');
        // }

        throw new Error(`Unhandled case ${Tag[(type as any).tag]}`);
    }

    export function resolve(context: Context, type: Type): Decl {
        switch (type.tag) {
            case Tag.TypeRefDecl:   return type.declaration;
            case Tag.TypeRefStatic: return context.resolve(type);

            case Tag.TypeInfer:
            case Tag.TypeRefName:
                throw new Error(`Can not resolve '${Tag[type.tag]}', type must be resolved by Type Inference or Name Resolution`);
        }

        throw new Error(`Can not resolve '${Tag[(type as any).tag]}', not implemented in for Type.resolve`);
    }
}

export namespace Expr {
    export function getReturnType(context: Context, expr: Node): Type {
        switch (expr.tag) {
            case Tag.ExprCall:       return context.resolve(Node.as(expr.target, ExprRefStatic), DeclFunction).returnType;
            case Tag.ExprCallStatic: return context.resolveGlobal(expr.target, DeclFunction).returnType;
            case Tag.ExprConstant:   return expr.type;
            case Tag.ExprConstruct:  return expr.target;
            case Tag.ExprGetLocal:   return context.resolveLocal(expr.local, DeclVariable).type;
            case Tag.ExprRefStatic:  return new TypeRefStatic(expr.declaration, expr.member);
        }

        throw new Error(`Unhandled case ${Tag[(expr as any).tag]}`);
    }
}

export namespace Node {
    export function as<T extends NodeConstructor>(node: Node, type: T): InstanceType<T> {
        if (node.tag === type.tag) {
            return node as any;
        } else {
            throw new Error(`Expected a '${Tag[type.tag]}' - but got a '${Tag[node.tag]}'`);
        }
    }

    export function resolve<T extends NodeConstructor>(context: Context, id: Global): Decl
    export function resolve<T extends NodeConstructor>(context: Context, id: Global, type: T): InstanceType<T>
    export function resolve<T extends NodeConstructor>(context: Context, id: Global, type?: T): any {
        if (typeof(id) !== 'number') {
            throw new Error('Expecting id to be a number');
        }

        if (id >= context.module.nodes.length) {
            throw new Error('id is out of bounds');
        }

        const node = context.module.nodes[id];

        if (type === undefined || node.tag === type.tag) {
            return node as any;
        } else {
            throw new Error(`Expected a '${Tag[type.tag]}' - but got a '${Tag[node.tag]}'`);
        }
    }
}

export const RootId = -1;
export const UnresolvedId = -2;

export class Context<T extends Decl = Decl> {
    public constructor(
        public readonly compiler: Compiler,
        public readonly parentId: number,
        public readonly currentId: number,
        public readonly module: Module,
    ) {}

    public get parent(): T {
        return this.module.nodes[this.parentId] as T;
    }

    public nextId<T extends Decl = Decl>(parent: number) {
        return new Context<T>(this.compiler, parent, UnresolvedId, this.module);
    }

    public nextId2(parent: number, child: number) {
        return new Context<T>(this.compiler, parent, child, this.module);
    }

    public resolveGlobal<T extends NodeConstructor<Decl>>(ref: Global, type?: T): InstanceType<T> {
        if (typeof(ref) !== 'number') {
            throw new Error();
        }

        return check(this.module.nodes[ref as number], type);
    }

    public resolveLocal<T extends NodeConstructor<Decl>>(ref: Local, type?: T): InstanceType<T> {
        if (typeof(ref) !== 'number') {
            throw new Error();
        }

        return check(Node.as(this.parent, DeclFunction).variables[ref], type);
    }

    public resolve<T extends NodeConstructor<Decl>>(ref: ExprRefStatic | TypeRefStatic | ExprDeclaration, type?: T): InstanceType<T> {
        if (ref.declaration === -1) {
            return check(this.module.nodes[ref.member as number], type);
        }

        const declaration = this.module.nodes[ref.declaration as number];
        const member = ref.member as number;

        switch (declaration.tag) {
            case Tag.DeclFunction:  return check(declaration.variables[member], type);
            //case Tag.DeclImport:    return check(declaration.references[member], type);
            default: throw new Error(`Not implemented for ${Tag[declaration.tag]}`);
        }
    }

    public register(decl: Decl) {
        const id = this.module.nodes.length;
        this.module.nodes.push(decl);
        return id;
    }
}

function check<T extends NodeConstructor<Decl>>(decl: Decl, type?: T): InstanceType<T> {
    return type === undefined ? decl as any : Node.as(decl, type);
}