export enum Tag {
    Class,
    Function,
    Trait,
    Variable,
    ExCall,
    ExConstruct,
    ExConstant,
    ExVariable
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
    | ExConstruct
    | ExVariable;

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

// TODO: Look at removing this and replacing it directly with Variable
export class ExVariable implements IThing, IExpression {
    public ast: any;
    public tag: Tag.ExVariable = Tag.ExVariable;

    public result_type: Type | undefined;
    public variable: Variable;

    public constructor(ast: Node, variable: Variable){
        this.ast = ast;
        this.variable = variable;
        this.result_type = variable.type;
    }
}

export class Scope {
    private readonly classes    = new Map<string, Class>();
    private readonly functions  = new Map<string, Function>();
    private readonly traits     = new Map<string, Trait>();
    private readonly types      = new Map<string, Type>();
    private readonly variables  = new Map<string, Variable>();

    public readonly parent: Scope | null;

    public constructor(parent?: Scope){
        this.parent = parent === undefined ? null : parent;
    }

    public declareClass(thing: Class){
        if(this.types.has(thing.id)){
            throw new Error('Not implemented yet');
        }

        this.classes.set(thing.id, thing);
        this.types.set(thing.id, thing);
    }

    public declareFunction(thing: Function){
        if(this.types.has(thing.id)){
            throw new Error('Not implemented yet');
        }

        this.functions.set(thing.id, thing);
        this.types.set(thing.id, thing);
    }

    public declareTrait(thing: Trait){
        if(this.types.has(thing.id)){
            throw new Error('Not implemented yet');
        }

        this.traits.set(thing.id, thing);
        this.types.set(thing.id, thing);
    }

    public declareType(thing: Type){
        if(this.types.has(thing.id)){
            throw new Error('Not implemented yet');
        }

        switch(thing.tag){
            case Tag.Class:     return this.declareClass(thing);
            case Tag.Function:  return this.declareFunction(thing);
            case Tag.Trait:     return this.declareTrait(thing);
            default: throw new Error('Incomplete switch');
        }
    }

    public declareVariable(thing: Variable){
        if(this.variables.has(thing.id)){
            throw new Error('Not implemented yet');
        }

        this.variables.set(thing.id, thing);
    }

    private static lookup<T>(
        scope: Scope,
        name: string,
        getMap: (scope: Scope) => Map<string, T>,
        register: (this: Scope, thing: T) => void,
    ){
        const thing = getMap(scope).get(name);

        if(thing !== undefined){
            return thing;
        }

        let parent = scope.parent;
        while(parent !== null){
            const thing = getMap(parent).get(name);

            if(thing !== undefined){
                // Import name into local scope for fast lookups
                register.call(scope, thing);
                return thing;
            }

            parent = parent.parent;
        }

        return undefined;
    }

    public lookupClass(name: string) {
        return Scope.lookup(this, name, x => x.classes, Scope.prototype.declareClass);
    }

    public lookupFunction(name: string) {
        return Scope.lookup(this, name, x => x.functions, Scope.prototype.declareFunction);
    }

    public lookupTrait(name: string){
        return Scope.lookup(this, name, x => x.traits, Scope.prototype.declareTrait);
    }

    public lookupType(name: string) {
        return Scope.lookup(this, name, x => x.types, Scope.prototype.declareType);
    }

    public lookupVariable(name: string) {
        return Scope.lookup(this, name, x => x.variables, Scope.prototype.declareVariable);
    }
}