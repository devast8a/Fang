import { NodeType } from './ast/visitor';
import { Constructor } from './common/constructor';
import { Compiler } from './compile';

export enum Tag {
    DeclFunction,
    DeclModule,
    DeclStruct,
    DeclSymbol,
    DeclTrait,
    DeclVariable,
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
    ExprVariable,
    ExprWhile,
    TypeInfer,
    TypeRefDecl,
    TypeRefName,
    TypeRefStatic,
}

export type Node =
    | Expr
    | Decl
    | Type
    ;

export type Decl =
    | DeclFunction      // fn name(parameters...) -> returnType { body... }
    | DeclModule
    | DeclStruct        // class name { members... }
    | DeclSymbol        // Any symbol
    | DeclTrait         // trait name { members... }
    | DeclVariable      // val name: Type = Expr
    ;

export type Expr =
    | ExprCall          // <target>(arguments...)           [resolves to ExprCallField, ExprCallStatic]
    | ExprCallField     // object.field(arguments...)
    | ExprCallStatic    // target(arguments...)
    | ExprConstant      // Any constant value
    | ExprConstruct     // T{}
    | ExprDeclaration   //
    | ExprGetField      // expression.field                 [as r-value]
    | ExprGetLocal      // local                            [as r-value]
    | ExprMacroCall     // macro! argument
    | ExprRefName       //                                  [resolves to ExprRefStatic]
    | ExprRefStatic     //
    | ExprSetField      // Expr.field = expression
    | ExprSetLocal      // local = expression
    | ExprDestroyField  // delete! expression.field
    | ExprDestroyLocal  // delete! variable
    | ExprIf            // if (condition) { ... } else if (condition) { ... } else { ... }
    | ExprIfBranch      // Branches of an if statement
    | ExprReturn        // return expression
    | ExprWhile         // while (condition) { ... }
    ;

export type Type =
    | TypeInfer         // Infer this type. Not valid everywhere.
    | TypeRefDecl       //
    | TypeRefName       //
    | TypeRefStatic     //
    ;

// References
//  Remove concept of global/field/local?
//  All references are two indexes. Parent / Field?
type Global = string | number;
type Field  = string | number;
type Local  = string | number;

export class DeclFunction {
    public readonly tag = Tag.DeclFunction;
    public static readonly tag = Tag.DeclFunction;

    public variables = new Array<DeclVariable>();

    public constructor(
        public parent: number,
        public id: number,

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

export class DeclModule {
    public readonly tag = Tag.DeclModule;
    public static readonly tag = Tag.DeclModule;

    public readonly parent = -1;
    public readonly id = 0;
    public readonly name = ""; // ???

    public constructor(
        public nodes: Decl[],
    ) {}
}

export class DeclStruct {
    public readonly tag = Tag.DeclStruct;
    public static readonly tag = Tag.DeclStruct;

    public constructor(
        public parent: number,
        public id: number,

        public name: string,
        public members: Map<string, Global>,
        public superTypes: Set<Type>,
    ) {}
}

export class DeclSymbol {
    public readonly tag = Tag.DeclSymbol;
    public static readonly tag = Tag.DeclSymbol;

    public readonly nodes = new Array<Global>();

    public constructor(
        public parent: number,
        public id: number,

        public name: string,
    ) {}
}

export class DeclTrait {
    public readonly tag = Tag.DeclTrait;
    public static readonly tag = Tag.DeclTrait;

    public constructor(
        public parent: number,
        public id: number,

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
        public id: number,

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
        public id: number,
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
        public type: Global,
    ) {}
}

export class TypeRefName {
    public readonly tag = Tag.TypeRefName;
    public static readonly tag = Tag.TypeRefName;

    public constructor(
        public name: string,
    ) {}
}

export namespace Type {
    export function canAssignTo(context: Context, child: Type | Decl, parent: Type | Decl) {
        return Type.isSubType(context, child, parent);
    }

    export function isSubType(context: Context, child: Type | Decl, parent: Type | Decl): boolean {
        switch (parent.tag) {
            case Tag.DeclStruct:    break;
            case Tag.TypeRefStatic: return isSubType(context, child, context.resolve(parent.type));
            default: throw new Error(`isSubType: Has no handler for parent node '${Tag[parent.tag]}'`);
        }

        switch (child.tag) {
            case Tag.DeclStruct: return child === parent;
            case Tag.TypeRefStatic: return isSubType(context, context.resolve(child.type), parent);
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
        throw new Error("Not implemented yet");
    }
    
    export function is(context: Context, type: Type, tag: Tag): boolean {
        throw new Error("Not implemented yet");
    }
}

export namespace Expr {
    export function getReturnType(context: Context, expr: Node): Type {
        switch (expr.tag) {
            case Tag.ExprGetLocal: {
                // TODO: Handle declarations properly after we fix the local/global symbol index problem
                const symbol   = Node.resolve(context, expr.local, DeclSymbol);
                const variable = Node.as(context.parent, DeclFunction).variables[symbol.nodes[0] as number];
                return variable.type;
            }

            case Tag.ExprConstruct: {
                return expr.target;
            }
        }

        throw new Error(`Unhandled case ${Tag[(expr as any).tag]}`);
    }
}

export namespace Node {
    export function as<T extends NodeType>(node: Node, type: T): InstanceType<T> {
        if (node.tag === type.tag) {
            return node as any;
        } else {
            throw new Error(`Expected a '${Tag[type.tag]}' - but got a '${Tag[node.tag]}'`);
        }
    }

    export function resolve<T extends NodeType>(context: Context, id: Global): Decl
    export function resolve<T extends NodeType>(context: Context, id: Global, type: T): InstanceType<T>
    export function resolve<T extends NodeType>(context: Context, id: Global, type?: T): any {
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

export const UnresolvedId = -1;

export class Context<T extends Decl = Decl> {
    public constructor(
        public readonly compiler: Compiler,
        public readonly parentId: number,
        public readonly module: DeclModule,
    ) {}

    public get parent(): T {
        return this.module.nodes[this.parentId] as T;
    }

    public nextId<T extends Decl = Decl>(parent: number) {
        return new Context<T>(this.compiler, parent, this.module);
    }

    public next<T extends Decl>(parent: T) {
        return new Context<T>(this.compiler, parent.id, this.module);
    }

    public resolve(global: Global) {
        if (typeof(global) !== 'number') {
            throw new Error();
        }

        return this.module.nodes[global];
    }

    public resolveMany(globals: Global[]) {
        return globals.map(global => this.resolve(global));
    }

    public resolve2(ref: ExprRefStatic): Decl {
        const declaration = this.module.nodes[ref.declaration as number];
        const member = ref.member as number;

        switch (declaration.tag) {
            case Tag.DeclModule:   return declaration.nodes[member];
            case Tag.DeclFunction: return declaration.variables[member];
            default: throw new Error('Not implemented');
        }
    }
}