export enum Tag {
    Class,
    Function,
    Trait,
    Variable,
    ExprCallField,
    ExprCallStatic,
    ExprConstant,
    ExprConstruct,
    ExprGetField,
    ExprGetLocal,
    ExprMacroCall,
    ExprRefName,
    ExprSetField,
    ExprSetLocal,
    ExprVariable,
    FunctionSignature,
    Generic,
    GenericApply,
    GenericParameter,
    StmtDelete,
    StmtIf,
    StmtIfBranch,
    StmtReturn,
    StmtWhile,
    TypeInfer,
    TypeRefName,
}

export type Node =
    | Class             // class name { members... }
    | Function          // fn name(parameters...) -> returnType { body... }
    | Trait             // trait name { members... }
    | Variable          // val name: Type = Expr
    | ExprCallField     // object.field(arguments...)
    | ExprCallStatic    // target(arguments...)
    | ExprConstant      // Any constant value
    | ExprConstruct     // T{}
    | ExprGetField      // Expr.field           [as r-value]
    | ExprGetLocal      // local                [as r-value]
    | ExprMacroCall     // macro! argument
    | ExprRefName       // Reference a symbol by name (Resolve to expr)
    | ExprSetField      // Expr.field = expression
    | ExprSetLocal      // local = expression
    | StmtDelete        // delete! variable
    | StmtIf            // if (condition) { ... } else if (condition) { ... } else { ... }
    | StmtIfBranch      // Branches of an if statement
    | StmtReturn        // return expression
    | StmtWhile         // while (condition) { ... }
    | Type              // TODO: Merge type into node
    ;

export type Type =
    | Class                     // class name { members... }
    | Function                  // fn name(parameters...) -> returnType { body... }
    | Trait                     // trait name { members... }
    | FunctionSignature         // fn name(parameters...) -> returnType
    | Generic<Type>             // Definition of a generic type
    | GenericApply<Type>        // Instantiate a generic type
    | GenericParameter<Type>    // Parameter of a generic type
    | TypeRefName               // Reference a symbol by name (Resolve to type)
    | TypeInfer                 // Infer this type. Not valid everywhere.
    ;

export class Class {
    public readonly tag = Tag.Class;
    public static readonly tag = Tag.Class;

    public constructor(
        public name: string,
        public members: Array<Node>,
        public superTypes: Set<Type>,
    ) {}
}

export class Trait {
    public readonly tag = Tag.Trait;
    public static readonly tag = Tag.Trait;

    public constructor(
        public name: string,
        public members: Array<Node>,
        public superTypes: Set<Type>,
    ) {}
}

export class Function {
    public readonly tag = Tag.Function;
    public static readonly tag = Tag.Function;

    public variables = new Array<Variable>();

    public constructor(
        public name: string,
        public parameters: Array<Variable>,
        public returnType: Type,
        public body: Array<Node>,
        public flags: FunctionFlags,
    ) {}
}

export enum FunctionFlags {
    None        = 0,
    Abstract    = 1 << 1,
}

export class TypeRefName {
    public readonly tag = Tag.TypeRefName;
    public static readonly tag = Tag.TypeRefName;

    public constructor(
        public name: string
    ) {}
}

export class TypeInfer {
    public readonly tag = Tag.TypeInfer;
    public static readonly tag = Tag.TypeInfer;
}

export class Generic<T> {
    public readonly tag = Tag.Generic;
    public static readonly tag = Tag.Generic;

    public constructor(
        public target: T,
        public parameters: Array<GenericParameter<T>>,
    ) {}
}

export class GenericApply<T> {
    public readonly tag = Tag.GenericApply;
    public static readonly tag = Tag.GenericApply;

    public constructor(
        public generic: Generic<T>,
        public args: Array<Type>
    ) {}
}

export class GenericParameter<T> {
    public readonly tag = Tag.GenericParameter;
    public static readonly tag = Tag.GenericParameter;

    public constructor(
        public generic: Generic<T>,
        public index: number,
    ) {}
}

export class FunctionSignature {
    public readonly tag = Tag.FunctionSignature;
    public static readonly tag = Tag.FunctionSignature;

    public constructor(
        public parameters: Array<Type>,
        public returnType: Type,
    ) {}
}

export class Variable {
    public readonly tag = Tag.Variable;
    public static readonly tag = Tag.Variable;

    public constructor(
        public name: string,
        public type: Type,
        public value: Node | null,
        public flags: VariableFlags,
        public id: number,
    ) {}
}

export enum VariableFlags {
    None    = 0,
    Local   = 1 << 0,
    Mutates = 1 << 1,
    Owns    = 1 << 2,
}

export class ExprCallField {
    public readonly tag = Tag.ExprCallField;
    public static readonly tag = Tag.ExprCallField;

    public constructor(
        public object: Node,
        public field: Function,
        public args: Array<Node>,
    ) {}
}

export class ExprCallStatic {
    public readonly tag = Tag.ExprCallStatic;
    public static readonly tag = Tag.ExprCallStatic;

    public constructor(
        public target: Function | ExprRefName,
        public args: Array<Node>,
    ) {}
}

export class ExprConstruct {
    public readonly tag = Tag.ExprConstruct;
    public static readonly tag = Tag.ExprConstruct;

    public constructor(
        public target: Type,
        public args: Array<Node>,
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

export class ExprGetField {
    public readonly tag = Tag.ExprGetField;
    public static readonly tag = Tag.ExprGetField;

    public constructor(
        public object: Node,
        public field: RefVar,
    ) {}
}

export class ExprGetLocal {
    public readonly tag = Tag.ExprGetLocal;
    public static readonly tag = Tag.ExprGetLocal;
    
    public constructor(
        public local: RefVar,
    ) {}
}

export class ExprMacroCall {
    public readonly tag = Tag.ExprMacroCall;
    public static readonly tag = Tag.ExprMacroCall;

    public constructor(
        public target: string,
        public args: Node[],
    ) {}
}

export class ExprRefName {
    public readonly tag = Tag.ExprRefName;
    public static readonly tag = Tag.ExprRefName;

    public constructor(
        public name: string,
    ) {}
}

export class ExprSetField {
    public readonly tag = Tag.ExprSetField;
    public static readonly tag = Tag.ExprSetField;

    public constructor(
        public object: Node,
        public field: RefVar,
        public value: Node,
    ) {}
}

export class ExprSetLocal {
    public readonly tag = Tag.ExprSetLocal;
    public static readonly tag = Tag.ExprSetLocal;

    public constructor(
        public local: RefVar,
        public value: Node,
    ) {}
}

export class StmtDelete {
    public readonly tag = Tag.StmtDelete;
    public static readonly tag = Tag.StmtDelete;

    public constructor(
        public variable: RefVar,
    ) {}
}

export class StmtIf {
    public readonly tag = Tag.StmtIf;
    public static readonly tag = Tag.StmtIf;

    public constructor(
        public branches: Array<StmtIfBranch>,
        public elseBranch: Array<Node>,
    ) {}
}

export class StmtIfBranch {
    public readonly tag = Tag.StmtIfBranch;
    public static readonly tag = Tag.StmtIfBranch;

    public constructor(
        public condition: Node,
        public body: Array<Node>,
    ) {}
}

export class StmtReturn {
    public readonly tag = Tag.StmtReturn;
    public static readonly tag = Tag.StmtReturn;

    public constructor(
        public expression: Node | null,
    ) {}
}

export class StmtWhile {
    public readonly tag = Tag.StmtWhile;
    public static readonly tag = Tag.StmtWhile;

    public constructor(
        public condition: Node,
        public body: Array<Node>
    ) {}
}

export type RefVar = number | string;

export namespace Type {
    export function canAssignTo(child: Type, parent: Type) {
        return Type.isSubType(child, parent);
    }

    export function isSubType(child: Type, parent: Type) {
        if (child === parent) {
            return true;
        }

        switch (parent.tag) {
            case Tag.Class:    return false;
            case Tag.Function: return false;

            case Tag.Trait: {
                switch (child.tag) {
                    case Tag.Class:
                    case Tag.Trait:
                        return child.superTypes.has(parent);

                    default:
                        return false;
                }
            }

            case Tag.TypeRefName: {
                console.log(child, parent);
            }
        }

        throw new Error(`isSubType: Has no handler for node '${Tag[parent.tag]}'`);
    }
}

export namespace Node {
    export function getReturnType(expr: Node, context: Function): Type {
        switch (expr.tag) {
            case Tag.ExprCallField:  return expr.field.returnType;
            case Tag.ExprCallStatic: return (expr.target.tag === Tag.Function ? expr.target.returnType : null as any);
            case Tag.ExprConstant:   return expr.type;
            case Tag.ExprConstruct:  return expr.target;
            case Tag.ExprGetField:   throw new Error('Not implemented'); // TODO: Broken
            case Tag.ExprGetLocal:   return context.variables[expr.local as number].type;
            case Tag.ExprMacroCall:  throw new Error('Not implemented');
            case Tag.ExprRefName:    throw new Error('Not implemented'); // TODO: Poison system
            case Tag.ExprSetField:   return getReturnType(expr.value, context);
            case Tag.ExprSetLocal:   return getReturnType(expr.value, context);
        }

        throw new Error(`Unhandled case ${Tag[expr.tag]}`);
    }
}