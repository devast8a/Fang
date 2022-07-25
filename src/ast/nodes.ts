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

    // Ref
    RefFieldId,
    RefFieldName,
    RefId,
    RefIds,
    RefInfer,
    RefName,
    RefUpvalue,
}

export type Node =
    | Expr
    | Ref<any>

export type Type<T extends Node = Node> = Ref<T>;
export type Local<T extends Node = Node> = RefId<T>;

export class Scope {
    public constructor(
        private readonly parent: Scope | null,
        private readonly declared: Map<string, number[]>,
        private readonly cache: Map<string, number[]>,
    ) { }

    public push() {
        return new Scope(this, new Map(), new Map());
    }

    public declare(symbol: string, id: number) {
        const ids = this.declared.get(symbol);
    
        if (ids === undefined) {
            const ids = [id];
            this.declared.set(symbol, ids);
            // There might already be an entry for cache set. Overwrite it.
            this.cache.set(symbol, ids);
        } else {
            ids.push(id);
        }
    }

    public lookup(symbol: string) {
        let start: Scope = this;
        let current: Scope | null = this;
        let distance = 0;

        do {
            const ids = current.declared.get(symbol);

            // Symbol does not exist in current scope, look in parent
            if (ids === undefined) {
                current = current.parent;
                distance++;
                continue;
            }

            // Resolved the symbol, cache it
            while (start !== current) {
                start.cache.set(symbol, ids);

                // We will hit current before we hit null
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                start = start.parent!;
            }

            return {
                ids: ids,
                distance: distance,
            };
        } while (current !== null)

        // Symbol does not exist at all.
        return null;
    }
}

// =============================================================================
export type Expr =
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
        readonly value: Local | null,
    ) { }
}

export class Call {
    readonly tag = Tag.Call
    readonly id = id();

    constructor(
        readonly target: Ref<Function>,
        readonly args: readonly Local[],
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
        readonly args: readonly Local[],
    ) { }
}

export class Continue {
    readonly tag = Tag.Continue
    readonly id = id();

    constructor(
        readonly target: Ref | null,
        readonly value: Local | null,
    ) { }
}

export class Enum {
    readonly tag = Tag.Enum
    readonly id = id();

    constructor(
        readonly name: string,
        readonly body: Local[],
    ) { }
}

export class ForEach {
    readonly tag = Tag.ForEach
    readonly id = id();

    constructor(
        readonly element: Local,
        readonly collection: Local,
        readonly body: Local[],
    ) {}
}

export class Function {
    readonly tag = Tag.Function
    readonly id = id();

    constructor(
        readonly name: string | null,
        readonly returnType: Type,
        readonly parameters: readonly Local<Variable>[],
        readonly body: Local[],
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
        readonly condition: Local | null,
        readonly body: Local[],
    ) { }
}

export class Match {
    readonly tag = Tag.Match
    readonly id = id();

    constructor(
        readonly value: Local,
        readonly cases: MatchCase[],
    ) { }
}

export class MatchCase {
    constructor(
        readonly value: Local,
        readonly body: Local[],
    ) { }
}

export class Move {
    readonly tag = Tag.Move
    readonly id = id();

    constructor(
        readonly value: Local,
    ) { }
}

export class Return {
    readonly tag = Tag.Return
    readonly id = id();

    constructor(
        readonly value: Local | null,
    ) { }
}

export class Set {
    readonly tag = Tag.Set
    readonly id = id();

    constructor(
        readonly target: Ref<Variable>,
        readonly source: Local,
    ) { }
}

export class Struct {
    readonly tag = Tag.Struct
    readonly id = id();

    constructor(
        readonly name: string,
        readonly body: Local[],
    ) { }
}

export class Trait {
    readonly tag = Tag.Trait
    readonly id = id();

    constructor(
        readonly name: string,
        readonly body: Local[],
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
    | RefUpvalue<T>

export class RefFieldId<T extends Node = Node> {
    readonly tag = Tag.RefFieldId

    constructor(
        readonly object: Ref,
        readonly target: number,
    ) { }
}

export class RefFieldName<T extends Node = Node> {
    readonly tag = Tag.RefFieldName

    constructor(
        public object: Ref,
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

export class RefUpvalue<T extends Node = Node> {
    readonly tag = Tag.RefUpvalue;

    constructor(
        readonly id: number,
        readonly distance: number,
    ) { }
}