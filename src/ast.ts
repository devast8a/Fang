import { Compiler } from './compile';
import { canSubType, canMonomorphize } from './type_api';

// TODO: Remove IDs

// TODO: Remove IDs
export enum Tag {
    Class,
    Function,
    Trait,
    Variable,

    CallField,
    CallStatic,
    Constant,
    Construct,
    GetField,
    GetVariable,
    SetField,
    SetVariable,
    Return,

    Poison,
}
export const TagCount = Math.max(...Object.values(Tag).filter(x => typeof(x) === 'number') as number[]) + 1;

export interface Poison {
    tag: Tag.Poison;
}
export const Poison: Poison = {
    tag: Tag.Poison,
};
export function isPoisoned<T>(value: T | Poison): value is Poison {
    return value === Poison;
}

// TODO: Make the parser strongly typed
type Node = any;

export type VisitorFn<T> = (visitor: T, thing: Thing) => void;
export interface Visitor<T> {
    visit: VisitorFn<T>[];
}

export function visit<T extends Visitor<T>>(thing: Thing, visitor: T){
    const queue = [thing];

    while(queue.length > 0){
        queue.pop()!.visit(visitor, queue);
    }
}

type Constructor<T = any, P = object> = {new(...args: any[]): any, prototype: P};

export function register<V extends Visitor<V>, T extends Constructor<Thing> & {tag: Tag} >(
    thing: T,
    visitors: VisitorFn<V>[],
    handler: (visitor: V, thing: InstanceType<T>) => void
){
    visitors[thing.tag] = handler as any;
}

interface IThing {
    ast: Node;
    poisoned: boolean;

    tag: Tag;

    visit<T extends Visitor<T>>(visitor: T, next: Thing[]): void;
}
export type Thing =
      Class
    | CallField
    | CallStatic
    | Constant
    | Construct
    | Function
    | GetField
    | GetVariable
    | Return
    | SetField
    | SetVariable
    | Trait
    | Variable;

interface IType {
    name: string;
    id: string;
}
export type Type =
      Class
    | Function
    | Trait;

interface IExpr {
    expressionResultType: Type | undefined;
}
export type Expr =
      CallField
    | CallStatic
    | Constant
    | Construct
    | GetField
    | GetVariable;

interface IStmt {
}
export type Stmt =
      CallField
    | CallStatic
    | Return
    | SetField
    | SetVariable
    | Variable;

export type Member =
      Class
    | Function
    | Trait
    | Variable;

export class Class implements IThing, IType {
    public ast: Node;
    public poisoned = false;
    public tag: Tag.Class = Tag.Class;
    public static tag: Tag.Class = Tag.Class;

    public name: string;
    public id: string;

    // TODO: Switch to arrays and use indexes to lookup
    public traits   = new Map<string, Trait>();
    public members  = new Map<string, Member>();

    public scope: Scope;

    public constructor(ast: Node, name: string, id: string, parentScope: Scope){
        this.scope = new Scope(parentScope.id + "C" + name + "_", parentScope);

        this.ast = ast;
        this.name = name;
        this.id = id;
    }

    public visit<T extends Visitor<T>>(visitor: T, next: Thing[]){
        visitor.visit[this.tag](visitor, this);

        for(const thing of this.members.values()){
            next.push(thing);
        }
    }
}

export class Function implements IThing, IType {
    public ast: Node;
    public poisoned = false;
    public tag: Tag.Function = Tag.Function;
    public static tag: Tag.Function = Tag.Function;

    public name: string;
    public id: string;

    public returnType: Type | undefined = undefined;
    public parameters = new Array<Variable>();
    public body = new Array<Stmt>();

    public scope: Scope;

    public constructor(ast: Node, name: string, id: string, parentScope: Scope){
        this.scope = new Scope(parentScope.id + "F" + name + "_", parentScope);

        this.ast = ast;
        this.name = name;
        this.id = id;
    }

    public visit<T extends Visitor<T>>(visitor: T, next: Thing[]){
        visitor.visit[this.tag](visitor, this);

        for(const thing of this.parameters){
            next.push(thing);
        }

        for(const thing of this.body){
            next.push(thing);
        }
    }
}

export class Trait implements IThing, IType {
    public ast: Node;
    public poisoned = false;
    public tag: Tag.Trait = Tag.Trait;
    public static tag: Tag.Trait = Tag.Trait;

    public name: string;
    public id: string;

    public traits   = new Map<string, Trait>();
    public members  = new Map<string, Member>();

    public scope: Scope;

    public constructor(ast: Node, name: string, id: string, parentScope: Scope){
        this.scope = new Scope(parentScope.id + "T" + name + "_", parentScope);

        this.ast = ast;
        this.name = name;
        this.id = id;
    }

    public visit<T extends Visitor<T>>(visitor: T, next: Thing[]){
        visitor.visit[this.tag](visitor, this);

        for(const thing of this.members.values()){
            next.push(thing);
        }
    }
}

export class Variable implements IThing, IType {
    public ast: Node;
    public poisoned = false;
    public tag: Tag.Variable = Tag.Variable;
    public static tag: Tag.Variable = Tag.Variable;

    public name: string;
    public id: string;

    public type: Type;
    public value: Expr | undefined;

    public constructor(ast: Node, name: string, type: Type, id: string){
        this.ast = ast;
        this.name = name;
        this.id = id;
        this.type = type;
    }

    public visit<T extends Visitor<T>>(visitor: T, next: Thing[]){
        visitor.visit[this.tag](visitor, this);

        if(this.value){
            next.push(this.value);
        }
    }
}

export class CallField implements IThing, IExpr {
    public ast: Node;
    public poisoned = false;
    public tag: Tag.CallField = Tag.CallField;
    public static tag: Tag.CallField = Tag.CallField;

    public expressionResultType: Type | undefined;

    public expression: Expr;
    public target: Function;
    public arguments = new Array<Expr>();

    public constructor(ast: Node, expression: Expr, target: Function){
        this.ast = ast;
        this.expression = expression;
        this.target = target;
        this.expressionResultType = target.returnType;
    }

    public visit<T extends Visitor<T>>(visitor: T, next: Thing[]){
        visitor.visit[this.tag](visitor, this);

        next.push(this.expression);

        for(const thing of this.arguments){
            next.push(thing);
        }
    }
}

export class CallStatic implements IThing, IExpr {
    public ast: Node;
    public poisoned = false;
    public tag: Tag.CallStatic = Tag.CallStatic;
    public static tag: Tag.CallStatic = Tag.CallStatic;

    public expressionResultType: Type | undefined;

    public target: Function;
    public arguments = new Array<Expr>();

    public constructor(ast: Node, target: Function){
        this.ast = ast;
        this.target = target;
        this.expressionResultType = target.returnType;
    }

    public visit<T extends Visitor<T>>(visitor: T, next: Thing[]){
        visitor.visit[this.tag](visitor, this);

        for(const thing of this.arguments){
            next.push(thing);
        }
    }
}

export class Constant implements IThing, IExpr {
    public ast: Node;
    public poisoned = false;
    public tag: Tag.Constant = Tag.Constant;
    public static tag: Tag.Constant = Tag.Constant;

    public expressionResultType: Type | undefined;
    public value: any;

    public constructor(ast: Node, type: Type, value: any){
        this.ast = ast;
        this.expressionResultType = type;
        this.value = value;
    }

    public visit<T extends Visitor<T>>(visitor: T, next: Thing[]){
        visitor.visit[this.tag](visitor, this);
    }
}

export class Construct implements IThing, IExpr {
    public ast: Node;
    public poisoned = false;
    public tag: Tag.Construct = Tag.Construct;
    public static tag: Tag.Construct = Tag.Construct;

    public expressionResultType: Type | undefined;

    public target: Type;
    public arguments = Array<Expr>();

    public constructor(ast: Node, target: Type){
        this.ast = ast;
        this.target = target;
        this.expressionResultType = this.target;
    }

    public visit<T extends Visitor<T>>(visitor: T, next: Thing[]){
        visitor.visit[this.tag](visitor, this);

        for(const thing of this.arguments){
            next.push(thing);
        }
    }
}

export class Return implements IThing, IExpr {
    public ast: Node;
    public poisoned = false;
    public tag: Tag.Return = Tag.Return;
    public static tag: Tag.Return = Tag.Return;

    public expressionResultType: Type | undefined;
    public value: Expr;

    public constructor(ast: Node, value: Expr){
        this.ast = ast;

        this.value = value;
        this.expressionResultType = value.expressionResultType;
    }

    public visit<T extends Visitor<T>>(visitor: T, next: Thing[]){
        visitor.visit[this.tag](visitor, this);

        next.push(this.value);
    }
}

export class GetVariable implements IThing, IExpr {
    public ast: Node;
    public poisoned = false;
    public tag: Tag.GetVariable = Tag.GetVariable;
    public static tag: Tag.GetVariable = Tag.GetVariable;

    public expressionResultType: Type | undefined;
    public variable: Variable;

    public constructor(ast: Node, variable: Variable){
        this.ast = ast;
        this.variable = variable;
        this.expressionResultType = variable.type;
    }

    public visit<T extends Visitor<T>>(visitor: T, next: Thing[]){
        visitor.visit[this.tag](visitor, this);
    }
}

export class GetField implements IThing, IExpr {
    public ast: Node;
    public poisoned = false;
    public tag: Tag.GetField = Tag.GetField;
    public static tag: Tag.GetField = Tag.GetField;

    public expressionResultType: Type | undefined;

    public target: Expr;
    public field: Variable;

    public constructor(ast: Node, target: Expr, field: Variable){
        this.ast = ast;

        this.target = target;
        this.field = field;
        this.expressionResultType = field.type;
    }

    public visit<T extends Visitor<T>>(visitor: T, next: Thing[]){
        visitor.visit[this.tag](visitor, this);

        next.push(this.target);
    }
}

export class SetVariable implements IThing {
    public ast: Node;
    public poisoned = false;
    public tag: Tag.SetVariable = Tag.SetVariable;
    public static tag: Tag.SetVariable = Tag.SetVariable;

    public target: Variable;
    public source: Expr;

    public constructor(ast: Node, target: Variable, source: Expr){
        this.ast = ast;

        this.target = target;
        this.source = source;
    }

    public visit<T extends Visitor<T>>(visitor: T, next: Thing[]){
        visitor.visit[this.tag](visitor, this);

        next.push(this.source);
    }
}

export class SetField implements IThing {
    public ast: Node;
    public poisoned = false;
    public tag: Tag.SetField = Tag.SetField;
    public static tag: Tag.SetField = Tag.SetField;

    public target: Expr;
    public field: Variable;
    public source: Expr;

    public constructor(ast: Node, target: Expr, field: Variable, source: Expr){
        this.ast = ast;

        this.target = target;
        this.field = field;
        this.source = source;
    }

    public visit<T extends Visitor<T>>(visitor: T, next: Thing[]){
        visitor.visit[this.tag](visitor, this);

        next.push(this.target);
        next.push(this.source);
    }
}

export class Scope {
    public readonly classes    = new Map<string, Class>();
    public readonly functions  = new Map<string, Function>();
    public readonly traits     = new Map<string, Trait>();
    public readonly types      = new Map<string, Type>();
    public readonly variables  = new Map<string, Variable>();

    public readonly parent: Scope | null;
    public readonly id: string;

    public constructor(id: string, parent?: Scope){
        this.id = id;
        this.parent = parent === undefined ? null : parent;
    }

    public declareClass(thing: Class){
        if(this.types.has(thing.name)){
            throw new Error('Not implemented yet');
        }

        this.classes.set(thing.name, thing);
        this.types.set(thing.name, thing);
    }

    public declareFunction(thing: Function){
        if(this.types.has(thing.name)){
            throw new Error('Not implemented yet');
        }

        this.functions.set(thing.name, thing);
        this.types.set(thing.name, thing);
    }

    public declareTrait(thing: Trait){
        if(this.types.has(thing.name)){
            throw new Error('Not implemented yet');
        }

        this.traits.set(thing.name, thing);
        this.types.set(thing.name, thing);
    }

    public declareType(thing: Type){
        if(this.types.has(thing.name)){
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
        if(this.variables.has(thing.name)){
            throw new Error('Not implemented yet');
        }

        this.variables.set(thing.name, thing);
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