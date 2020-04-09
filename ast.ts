export enum Tag {
    Class,
    Function,
    Trait,
    Variable,
    
    ExCall,
    ExConstruct,
    ExConstant
}

// TODO: Make the parser strongly typed
type Node = any;

interface IThing {
    ast: Node;

    tag: Tag;
}
export type Thing =
      Class
    | Function
    | Trait
    | Variable
    | ExCall
    | ExConstruct;

interface IType {
    name: string;
    id: string;
}
export type Type =
      Class
    | Function
    | Trait;

interface IExpression {
    result_type: Type | undefined;
}
export type Expression =
      ExCall
    | ExConstant
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

    public traits   = new Map<string, Trait>();
    public members  = new Map<string, Member>();

    public generic_parameters = new Array<Type>();

    public constructor(ast: Node, name: string, id: string){
        this.ast = ast;
        this.name = name;
        this.id = id;
    }
}

export class Function implements IThing, IType, IGeneric {
    public ast: Node;

    public tag: Tag.Function = Tag.Function;
    public name: string;
    public id: string;

    public return_type: Type | undefined = undefined;
    public parameters = new Array<Variable>();
    public body = new Array<Expression>();
    public generic_parameters = new Array<Type>();

    public constructor(ast: Node, name: string, id: string){
        this.ast = ast;
        this.name = name;
        this.id = id;
    }
}

export class Trait implements IThing, IType, IGeneric {
    public ast: Node;

    public tag: Tag.Trait = Tag.Trait;
    public name: string;
    public id: string;

    public traits   = new Map<string, Trait>();
    public members  = new Map<string, Member>();

    public generic_parameters = new Array<Type>();

    public constructor(ast: Node, name: string, id: string){
        this.ast = ast;
        this.name = name;
        this.id = id;
    }
}

export class Variable implements IThing, IType {
    public ast: Node;

    public tag: Tag.Variable = Tag.Variable;
    public name: string;
    public id: string;

    public type: Type;

    public constructor(ast: Node, name: string, type: Type, id: string){
        this.ast = ast;
        this.name = name;
        this.id = id;
        this.type = type;
    }
}

export class ExCall implements IThing, IExpression {
    public ast: Node;

    public tag: Tag.ExCall = Tag.ExCall;

    public result_type: Type | undefined;

    public target: Function;        // TODO: Going forward this shouldn't be restricted to Function
    public arguments = new Array<Expression>();

    public constructor(ast: Node, target: Function){
        this.ast = ast;
        this.target = target;
    }
}

export class ExConstant implements IThing, IExpression {
    public ast: any;
    public tag: Tag.ExConstant = Tag.ExConstant;

    public result_type: Type | undefined;
    public value: any;

    public constructor(ast: Node, type: Type, value: any){
        this.ast = ast;
        this.result_type = type;
        this.value = value;
    }
}

export class ExConstruct implements IThing, IExpression {
    public ast: Node;

    public tag: Tag.ExCall = Tag.ExCall;

    public result_type: Type | undefined;

    public target: Type;
    public arguments = new Array<Expression>();

    public constructor(ast: Node, target: Type){
        this.ast = ast;
        this.target = target;
    }
}