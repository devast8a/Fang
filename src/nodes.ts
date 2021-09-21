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
        public id: Global,
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
    export function canAssignTo(child: Type, parent: Type) {
        return Type.isSubType(child, parent);
    }

    export function isSubType(child: Type, parent: Type): boolean {
        // if (child === parent) {
        //     return true;
        // }

        // switch (parent.tag) {
        //     case Tag.DeclStruct:    return false;
        //     case Tag.DeclFunction: return false;

        //     case Tag.DeclTrait: {
        //         switch (child.tag) {
        //             case Tag.DeclStruct:
        //             case Tag.DeclTrait:
        //                 return child.superTypes.has(parent);

        //             default:
        //                 return false;
        //         }
        //     }

        //     case Tag.TypeRefName: {
        //         console.log(child, parent);
        //     }
        // }

        throw new Error(`isSubType: Has no handler for node '${Tag[parent.tag]}'`);
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

export namespace Node {
    export function getReturnType(context: Context, expr: Node): Type {
        // switch (expr.tag) {
        //     case Tag.ExprCallField:  return expr.field.returnType;
        //     case Tag.ExprCallStatic: return (expr.target.tag === Tag.DeclFunction ? expr.target.returnType : null as any);
        //     case Tag.ExprConstant:   return expr.type;
        //     case Tag.ExprConstruct:  return expr.target;
        //     case Tag.ExprGetField:   throw new Error('Not implemented yet');
        //     case Tag.ExprGetLocal:   return context.variables[expr.local as number].type;
        //     case Tag.ExprMacroCall:  throw new Error('Not implemented yet');
        //     case Tag.ExprRefName:    throw new Error('Not implemented yet');
        //     case Tag.ExprRefNode:    throw new Error('Not implemented yet');
        //     case Tag.ExprSetField:   return getReturnType(expr.value, context);
        //     case Tag.ExprSetLocal:   return getReturnType(expr.value, context);
        // }

        throw new Error(`Unhandled case ${Tag[(expr as any).tag]}`);
    }
}

export const UnresolvedId = -1;

export class Context<T extends Decl = Decl> {
    public constructor(
        public readonly parentId: number,
        public readonly module: DeclModule,
    ) {}

    public nextId<T extends Decl = Decl>(parent: number) {
        return new Context<T>(parent, this.module);
    }

    public next<T extends Decl>(parent: T) {
        return new Context<T>(parent.id, this.module);
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

    public get parent(): T {
        return this.module.nodes[this.parentId] as T;
    }
}