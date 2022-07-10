export enum Tag {
    // Decl
    Enum,
    Function,
    Struct,
    Trait,
    Variable,

    // Expr
    BlockAttribute,
    Break,
    Call,
    Constant,
    Construct,
    Continue,
    ForEach,
    Get,
    If,
    Move,
    Return,
    Set,
    While,

    // Ref
    RefFieldName,
    RefId,
    RefIds,
    RefInfer,
    RefName,
}

export type Node =
    | Decl
    | Expr
    | Ref<any>

export type Type<T extends Node = Node> = Ref<T>;
export type Local<T extends Node = Node> = RefId<T>;

export class Scope {
    public constructor(
        readonly parent: Scope | null,
        readonly symbols: Map<string, number[]>,
    ) { }
}

// =============================================================================
export type Decl =
    | Enum
    | Function
    | Struct
    | Trait
    | Variable

export class Enum {
    readonly tag = Tag.Enum

    constructor(
        readonly parent: Scope,
        readonly scope: Scope,
        readonly name: string,
        readonly body: Local[],
    ) { }
}

export class Function {
    readonly tag = Tag.Function

    constructor(
        readonly parent: Scope,
        readonly scope: Scope,
        readonly name: string | null,
        readonly returnType: Type,
        readonly parameters: readonly Local<Variable>[],
        readonly body: Local[],
        readonly external = false,
    ) { }
}

export class Struct {
    readonly tag = Tag.Struct

    constructor(
        readonly parent: Scope,
        readonly scope: Scope,
        readonly name: string,
        readonly body: Local[],
    ) { }
}

export class Trait {
    readonly tag = Tag.Trait

    constructor(
        readonly parent: Scope,
        readonly scope: Scope,
        readonly name: string,
        readonly body: Local[],
    ) { }
}

export class Variable {
    readonly tag = Tag.Variable

    constructor(
        readonly parent: Scope,
        readonly name: string,
        readonly type: Type,
    ) { }
}
export enum VariableFlags {
    None,
    Mutable,
    Owns,
}

// =============================================================================
export type Expr =
    | BlockAttribute
    | Break
    | Call
    | Constant<any>
    | Construct
    | Continue
    | ForEach
    | Get
    | If
    | Move
    | Return
    | Set
    | While

export class BlockAttribute {
    readonly tag = Tag.BlockAttribute

    constructor(
        readonly parent: Scope,
        readonly target: Ref,
    ) { }
}

export class Break {
    readonly tag = Tag.Break

    constructor(
        readonly parent: Scope,
        readonly target: Ref | null,
        readonly value: Local | null,
    ) { }
}

export class Call {
    readonly tag = Tag.Call

    constructor(
        readonly parent: Scope,
        readonly target: Ref<Function>,
        readonly args: readonly Local[],
    ) { }
}

export class Constant<Value> {
    readonly tag = Tag.Constant

    constructor(
        readonly parent: Scope,
        readonly type: Type,
        readonly value: Value,
    ) { }
}

export class Construct {
    readonly tag = Tag.Construct;

    constructor(
        readonly parent: Scope,
        readonly target: Ref<Struct>,
        readonly args: readonly Local[],
    ) { }
}

export class Continue {
    readonly tag = Tag.Continue

    constructor(
        readonly parent: Scope,
        readonly target: Ref | null,
        readonly value: Local | null,
    ) { }
}

export class ForEach {
    readonly tag = Tag.ForEach

    constructor(
        readonly parent: Scope,
        readonly element: Local,
        readonly collection: Local,
        readonly body: Local[],
    ) {}
}

export class Get {
    readonly tag = Tag.Get

    constructor(
        readonly parent: Scope,
        readonly target: Ref,
    ) { }
}


export class If {
    readonly tag = Tag.If

    constructor(
        readonly parent: Scope,
        readonly cases: readonly IfCase[],
    ) { }
}

export class IfCase {
    constructor(
        readonly condition: Local | null,
        readonly body: Local[],
    ) { }
}

export class Move {
    readonly tag = Tag.Move

    constructor(
        readonly parent: Scope,
        readonly value: Local,
    ) { }
}

export class Return {
    readonly tag = Tag.Return

    constructor(
        readonly parent: Scope,
        readonly value: Local | null,
    ) { }
}

export class Set {
    readonly tag = Tag.Set

    constructor(
        readonly parent: Scope,
        readonly target: Ref,
        readonly value: Local,
    ) { }
}

export class While {
    readonly tag = Tag.While

    constructor(
        readonly parent: Scope,
        readonly condition: Local,
        readonly body: Local[],
    ) {}
}

// =============================================================================
export type Ref<T extends Node = Node> =
    | RefFieldName<T>
    | RefId<T>
    | RefIds<T>
    | RefInfer
    | RefName<T>

export class RefFieldName<T extends Node = Node> {
    readonly tag = Tag.RefFieldName;

    constructor(
        readonly object: Ref,
        readonly target: string,
    ) { }
}

// Reference a single symbol
export class RefId<T extends Node = Node> {
    readonly tag = Tag.RefId

    constructor(
        readonly target: number,
    ) { }
}

// Reference a collection of symbols (ie. Overload resolution hasn't happened)
export class RefIds<T extends Node = Node> {
    readonly tag = Tag.RefIds

    constructor(
        readonly target: number[],
    ) { }
}

// Used to mark that a type should be inferred
export class RefInfer {
    readonly tag = Tag.RefInfer
}

export class RefName<T extends Node = Node> {
    readonly tag = Tag.RefName

    constructor(
        readonly target: string,
    ) { }
}