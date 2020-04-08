export enum Tag {
    Class,
    Function,
    Trait,
    Variable,
    
    ExCall,
    ExConstruct,
}

// TODO: Make the parser strongly typed
type Node = any;

interface IThing {
    ast: Node;

    tag: Tag;
    name: string;
    id: string;
}
export type Thing =
      Class
    | Function
    | Trait
    | Variable
    | ExCall
    | ExConstruct;

interface IType {
}
export type Type =
      Class
    | Function
    | Trait;

interface IExpression {
    resultType: Type;
}
export type Expression =
      ExCall
    | ExConstruct;

export type Member =
      Class
    | Function
    | Trait
    | Variable;

// All things that are allowed to be generic
type Generic = Class | Function | Trait;
interface IGeneric {
    generic_parameters: Type[];
}

export class Class implements IThing, IType, IGeneric {
    public ast: Node;

    public tag: Tag.Class = Tag.Class;
    public name: string;
    public id: string;

    public traits: Map<string, Trait>;
    public members: Map<string, Member>;

    public generic_parameters: Type[];
}

export class Function implements IThing, IType, IGeneric {
    public ast: Node;

    public tag: Tag.Function = Tag.Function;
    public name: string;
    public id: string;

    public parameters: Variable[];

    public generic_parameters: Type[];
}

export class Trait implements IThing, IType, IGeneric {
    public ast: Node;

    public tag: Tag.Trait = Tag.Trait;
    public name: string;
    public id: string;

    public traits: Map<string, Trait>;
    public members: Map<string, Member>;

    public generic_parameters: Type[];
}

export class Variable implements IThing, IType {
    public ast: Node;

    public tag: Tag.Variable = Tag.Variable;
    public name: string;
    public id: string;

    public type: Type;
}

export class ExCall implements IThing, IExpression {
    public ast: Node;

    public tag: Tag.ExCall = Tag.ExCall;
    public name: string;
    public id: string;

    public resultType: Type;

    public target: Function;        // TODO: Going forward this shouldn't be restricted to Function
    public arguments: Expression[];
}

export class ExConstruct implements IThing, IExpression {
    public ast: Node;

    public tag: Tag.ExCall = Tag.ExCall;
    public name: string;
    public id: string;

    public resultType: Type;

    public target: Type;
    public arguments: Expression[];
}