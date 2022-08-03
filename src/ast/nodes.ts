import { unreachable } from '../utils';

export enum Tag {
    // Expr
    BlockAttribute,
    Break,
    Call,
    Constant,
    Construct,
    Continue,
    Enum,
    ForEach,
    Function,
    Get,
    If,
    Match,
    Move,
    Return,
    Set,
    Struct,
    Trait,
    Variable,
    While,
}

export type Type<T extends Node = Node> = Ref<T>;
export type LocalRef<T extends Node = Node> = RefById<T>;

// =============================================================================
export type Node =
    | BlockAttribute
    | Break
    | Call
    | Constant<any>
    | Construct
    | Continue
    | Enum
    | ForEach
    | Function
    | Get
    | If
    | Match
    | Move
    | Return
    | Set
    | Struct
    | Trait
    | Variable
    | While

const id = () => undefined as any as number;

export class BlockAttribute {
    readonly tag = Tag.BlockAttribute
    readonly id = id();

    constructor(
        readonly target: Ref,
    ) { }
}

export class Break {
    readonly tag = Tag.Break
    readonly id = id();

    constructor(
        readonly target: Ref | null,
        readonly value: LocalRef | null,
    ) { }
}

export class Call {
    readonly tag = Tag.Call
    readonly id = id();

    constructor(
        readonly target: Ref<Function>,
        readonly args: readonly LocalRef[],
    ) { }
}

export class Constant<Value> {
    readonly tag = Tag.Constant
    readonly id = id();

    constructor(
        readonly type: Type,
        readonly value: Value,
    ) { }
}

export class Construct {
    readonly tag = Tag.Construct;
    readonly id = id();

    constructor(
        readonly target: Ref<Struct>,
        readonly args: readonly LocalRef[],
    ) { }
}

export class Continue {
    readonly tag = Tag.Continue
    readonly id = id();

    constructor(
        readonly target: Ref | null,
        readonly value: LocalRef | null,
    ) { }
}

export class Enum {
    readonly tag = Tag.Enum
    readonly id = id();

    constructor(
        readonly name: string,
        readonly body: LocalRef[],
    ) { }
}

export class ForEach {
    readonly tag = Tag.ForEach
    readonly id = id();

    constructor(
        readonly element: LocalRef,
        readonly collection: LocalRef,
        readonly body: LocalRef[],
    ) {}
}

export class Function {
    readonly tag = Tag.Function
    readonly id = id();

    constructor(
        readonly name: string | null,
        readonly returnType: Type,
        readonly parameters: readonly LocalRef<Variable>[],
        readonly body: LocalRef[],
        readonly external = false,
    ) { }
}

export class Get {
    readonly tag = Tag.Get
    readonly id = id();

    constructor(
        public source: Ref,
    ) { }
}

export class If {
    readonly tag = Tag.If
    readonly id = id();

    constructor(
        readonly cases: readonly IfCase[],
    ) { }
}

export class IfCase {
    constructor(
        readonly condition: LocalRef | null,
        readonly body: LocalRef[],
    ) { }
}

export class Match {
    readonly tag = Tag.Match
    readonly id = id();

    constructor(
        readonly value: LocalRef,
        readonly cases: MatchCase[],
    ) { }
}

export class MatchCase {
    constructor(
        readonly value: LocalRef,
        readonly body: LocalRef[],
    ) { }
}

export class Move {
    readonly tag = Tag.Move
    readonly id = id();

    constructor(
        readonly value: LocalRef,
    ) { }
}

export class Return {
    readonly tag = Tag.Return
    readonly id = id();

    constructor(
        readonly value: LocalRef | null,
    ) { }
}

export class Set {
    readonly tag = Tag.Set
    readonly id = id();

    constructor(
        readonly target: Ref<Variable>,
        readonly source: LocalRef,
    ) { }
}

export class Struct {
    readonly tag = Tag.Struct
    readonly id = id();

    constructor(
        readonly name: string,
        readonly body: LocalRef[],
    ) { }
}

export class Trait {
    readonly tag = Tag.Trait
    readonly id = id();

    constructor(
        readonly name: string,
        readonly body: LocalRef[],
    ) { }
}

export class Variable {
    readonly tag = Tag.Variable
    readonly id = id();

    constructor(
        readonly name: string,
        readonly type: Type,
        readonly flags: VariableFlags,
    ) { }
}
export enum VariableFlags {
    None,
    Mutable,
    Owns,
}

export class While {
    readonly tag = Tag.While
    readonly id = id();

    constructor(
        readonly condition: LocalRef,
        readonly body: LocalRef[],
    ) {}
}

// =============================================================================
export type Ref<T extends Node = Node> =
    | RefByExpr<T>
    | RefById<T>
    | RefByIds<T>
    | RefByName<T>
    | RefInfer<T>
    ;

export class RefByExpr<T extends Node = Node> {
    private _type!: T;  // Include T in Ref's structure for typescript's structural type system
    readonly type = RefType.Expr;

    constructor(
        readonly object: Ref | null,
        readonly values: Ref[],
    ) { }
}

export class RefById<T extends Node = Node> {
    private _type!: T;  // Include T in Ref's structure for typescript's structural type system
    readonly type = RefType.Id;

    constructor(
        readonly object: Ref | null,
        readonly id: number,
        readonly distance: number | Distance,
    ) { }
}

export class RefByIds<T extends Node = Node> {
    private _type!: T;  // Include T in Ref's structure for typescript's structural type system
    readonly type = RefType.Ids;

    constructor(
        readonly object: Ref | null,
        readonly ids: number[],
        readonly distance: number | Distance,
    ) { }
}

export class RefByName<T extends Node = Node> {
    private _type!: T;  // Include T in Ref's structure for typescript's structural type system
    readonly type = RefType.Name;

    constructor(
        readonly object: Ref | null,
        readonly name: string,
    ) { }
}

export class RefInfer<T extends Node = Node> {
    private _type!: T;  // Include T in Ref's structure for typescript's structural type system
    readonly type = RefType.Infer;

    constructor(
        readonly object: Ref | null,
    ) { }
}

export enum RefType {
    Expr,
    Id,
    Ids,
    Name,
    Infer,
}

export enum Distance {
    Global  = 'Global',
    Local   = 0,
}