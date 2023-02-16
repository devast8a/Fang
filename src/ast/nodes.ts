import { Constructor } from '../common/constructor';

export enum Tag {
    // Expr
    BlockAttribute = 'BlockAttribute',
    Break = 'Break',
    Call = 'Call',
    Constant = 'Constant',
    Construct = 'Construct',
    Continue = 'Continue',
    Destruct = 'Destruct',
    Enum = 'Enum',
    Extend = 'Extend',
    ForEach = 'ForEach',
    Function = 'Function',
    Get = 'Get',
    Group = 'Group',
    If = 'If',
    Match = 'Match',
    Move = 'Move',
    Return = 'Return',
    Set = 'Set',
    Struct = 'Struct',
    Trait = 'Trait',
    Variable = 'Variable',
    While = 'While',

    // Ref
    RefByExpr = 'RefByExpr',
    RefById = 'RefById',
    RefByIds = 'RefByIds',
    RefByName = 'RefByName',
    RefInfer = 'RefInfer',
}

export function isRef(o: Node | Ref): o is Ref { return o.tag.startsWith('Ref'); }
export function isNode(o: Node | Ref): o is Node { return !isRef(o); }

export type Type<T extends Node = Node> = Ref<T>;

export const LocalRef: Constructor<LocalRef> = undefined as any;
export type LocalRef<T extends Node = Node> = RefById<T>;

// =============================================================================
export const Node: Constructor<Node> = undefined as any;
export type Node =
    | BlockAttribute
    | Break
    | Call
    | Constant<any>
    | Construct
    | Continue
    | Destruct
    | Enum
    | Extend
    | ForEach
    | Function
    | Get
    | Group
    | If
    | Match
    | Move
    | Return
    | Set
    | Struct
    | Trait
    | Variable
    | While

// This function is a hack to give a
const id = () => undefined as any as number;

export class BlockAttribute {
    readonly tag = Tag.BlockAttribute
    readonly id = id()

    constructor(
        readonly attribute: Ref,
    ) { }
}

export class Break {
    readonly tag = Tag.Break
    readonly id = id()

    constructor(
        readonly loop: Ref | null,
        readonly value: LocalRef | null,
    ) { }
}

export class Call {
    readonly tag = Tag.Call
    readonly id = id()

    constructor(
        // TODO: Switch to Ref - Calls can target non-functions (closures, parameters, etc...)
        readonly func: Ref<Function>,
        readonly args: readonly LocalRef[],
    ) { }
}

export class Constant<Value = any> {
    readonly tag = Tag.Constant
    readonly id = id()

    constructor(
        readonly type: Type,
        readonly value: Value,
    ) { }
}

export class Construct {
    readonly tag = Tag.Construct;
    readonly id = id()

    constructor(
        readonly type: Ref,
        readonly args: readonly LocalRef[],
    ) { }
}

export class Continue {
    readonly tag = Tag.Continue
    readonly id = id()

    constructor(
        readonly loop: Ref | null,
    ) { }
}

export class Destruct {
    readonly tag = Tag.Destruct;
    readonly id = id()

    constructor(
        readonly value: Ref,
    ) { }
}

export class Enum {
    readonly tag = Tag.Enum
    readonly id = id()

    constructor(
        readonly name: string,
        readonly body: LocalRef[],
    ) { }
}

export class Extend {
    readonly tag = Tag.Extend
    readonly id = id()

    constructor(
        readonly target: Ref,
        readonly body: LocalRef[],
    ) { }
}

export class ForEach {
    readonly tag = Tag.ForEach
    readonly id = id()

    constructor(
        readonly element: LocalRef,
        readonly collection: LocalRef,
        readonly body: LocalRef[],
    ) { }
}

export class Function {
    readonly tag = Tag.Function
    readonly id = id()

    constructor(
        readonly name: string | null,
        public returnType: Type,
        readonly parameters: readonly LocalRef<Variable>[],
        readonly body: LocalRef[],
        readonly external = false,
    ) { }
}

export class Get {
    readonly tag = Tag.Get
    readonly id = id()

    constructor(
        public source: Ref,
    ) { }
}

export class Group {
    readonly tag = Tag.Group
    readonly id = id()

    constructor(
        public body: RefById[]
    ) { }
}

export class If {
    readonly tag = Tag.If
    readonly id = id()

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
    readonly id = id()

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
    readonly id = id()

    constructor(
        readonly value: LocalRef,
    ) { }
}

export class Return {
    readonly tag = Tag.Return
    readonly id = id()

    constructor(
        readonly value: LocalRef | null,
    ) { }
}

export class Set {
    readonly tag = Tag.Set
    readonly id = id()

    constructor(
        readonly target: Ref<Variable>,
        readonly source: LocalRef,
    ) { }
}

export class Struct {
    readonly tag = Tag.Struct
    readonly id = id()

    constructor(
        readonly name: string,
        readonly body: LocalRef[],
    ) { }
}

export class Trait {
    readonly tag = Tag.Trait
    readonly id = id()

    constructor(
        readonly name: string,
        readonly body: LocalRef[],
    ) { }
}

export class Variable {
    readonly tag = Tag.Variable
    readonly id = id()

    constructor(
        readonly name: string,
        public type: Type,
        public flags: VariableFlags,
    ) { }
}
export enum VariableFlags {
    None,
    Mutable,
    Owns,
}

export class While {
    readonly tag = Tag.While
    readonly id = id()

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
    private _type!: RefType<T>;
    readonly tag = Tag.RefByExpr;

    constructor(
        readonly object: Ref | null,
        readonly values: Ref[],
    ) { }
}

export class RefById<T extends Node = Node> {
    private _type!: RefType<T>;
    readonly tag = Tag.RefById;

    constructor(
        readonly object: Ref | null,
        readonly id: number,
        readonly distance: number | Distance,
    ) { }
}

export class RefByIds<T extends Node = Node> {
    private _type!: RefType<T>;
    readonly tag = Tag.RefByIds;

    constructor(
        readonly object: Ref | null,
        readonly ids: number[],
        readonly distance: number | Distance,
    ) { }
}

export class RefByName<T extends Node = Node> {
    private _type!: RefType<T>;
    readonly tag = Tag.RefByName;

    constructor(
        readonly object: Ref | null,
        readonly name: string,
    ) { }
}

export class RefInfer<T extends Node = Node> {
    private _type!: RefType<T>;
    readonly tag = Tag.RefInfer;

    constructor(
        readonly object: Ref | null,
    ) { }
}

export enum Distance {
    Global  = 'Global',
    Local   = 0,
}

// Because of TypeScript's structural type system, types are equivalent if their structure is equivalent.
// This is a problem because references don't use their generic type parameter in their structure,
//     resulting in Ref<Function> being equivalent to Ref<Struct> [1].
//
// So we use `_type!: RefType<T>` as a hack.
// - Use of RefType<T> just acts as a bookmark to direct towards this comment.
// - Use of T (aliased through RefType<T>) in the type ensures that Ref<Function> is not equivalent to Ref<Struct>.
// - Use of '!' overrides Strict Property Initialization errors [2].
//
// [1]: https://github.com/Microsoft/TypeScript/wiki/FAQ#generics
// [2]: https://www.typescriptlang.org/tsconfig/strictPropertyInitialization.html
type RefType<T> = T;