import { Compiler } from './compile';
import { canSubType, canMonomorphize } from './type_api';

// TODO: Remove IDs

export enum Tag {
    Class,
    Function,
    Trait,
    Variable,

    Call,
    Constant,
    Construct,
    GetField,
    GetVariable,
    SetField,
    SetVariable,
    Return,
}

class Poison {};
function isPoisoned<T>(value: T | Poison): value is Poison {
    return value === Poison;
}

// TODO: Make the parser strongly typed
type Node = any;

interface IThing {
    ast: Node;

    tag: Tag;

    checkTypes(compiler: Compiler): boolean;
}
export type Thing =
      Class
    | Call
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
    // TODO: change name to expressionResultType
    resultType: Type | undefined;
}
export type Expr =
      Call
    | Constant
    | Construct
    | GetField
    | GetVariable;

interface IStmt {
}
export type Stmt =
      Variable
    | Call
    | Return
    | SetField
    | SetVariable;

export type Member =
      Class
    | Function
    | Trait
    | Variable;

export class Class implements IThing, IType {
    public ast: Node;

    public tag: Tag.Class = Tag.Class;
    public name: string;
    public id: string;

    // TODO: Switch to arrays and use indexes to lookup
    public traits   = new Map<string, Trait>();
    public members  = new Map<string, Member>();

    public scope: Scope;

    public constructor(ast: Node, name: string, id: string, parentScope: Scope){
        this.scope = new Scope(parentScope.id + "_C" + name, parentScope);

        this.ast = ast;
        this.name = name;
        this.id = id;
    }

    public checkTypes(compiler: Compiler): boolean {
        let result = true;

        for(const member of this.members.values()){
            result = result && member.checkTypes(compiler);
        }
        
        for(const trait of this.traits.values()){
            // TODO: Return required members
            if(!canSubType(this, trait)){
                compiler.error("$0 is missing $2 required to implement $1",
                    [this.name, trait.name, '???'],
                    [this.ast[1]]
                )
                result = false;
            }
        }

        return result;
    }
}

export class Function implements IThing, IType {
    public ast: Node;

    public tag: Tag.Function = Tag.Function;
    public name: string;
    public id: string;

    public returnType: Type | undefined = undefined;
    public parameters = new Array<Variable>();
    public body = new Array<Stmt>();

    public scope: Scope;

    public constructor(ast: Node, name: string, id: string, parentScope: Scope){
        this.scope = new Scope(parentScope.id + "_F" + name, parentScope);

        this.ast = ast;
        this.name = name;
        this.id = id;
    }

    public checkTypes(compiler: Compiler): boolean {
        let result = true;

        for(const stmt of this.body){
            result = result && stmt.checkTypes(compiler);
        }

        return result;
    }
}

export class Trait implements IThing, IType {
    public ast: Node;

    public tag: Tag.Trait = Tag.Trait;
    public name: string;
    public id: string;

    public traits   = new Map<string, Trait>();
    public members  = new Map<string, Member>();

    public scope: Scope;

    public constructor(ast: Node, name: string, id: string, parentScope: Scope){
        this.scope = new Scope(parentScope.id + "_T" + name, parentScope);

        this.ast = ast;
        this.name = name;
        this.id = id;
    }

    public checkTypes(compiler: Compiler): boolean {
        let result = true;

        for(const member of this.members.values()){
            result = result && member.checkTypes(compiler);
        }

        return result;
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

    public checkTypes(compiler: Compiler): boolean {
        return true;
    }
}

export class Call implements IThing, IExpr {
    public ast: Node;

    public tag: Tag.Call = Tag.Call;

    public resultType: Type | undefined;

    public target: Function;        // TODO: Going forward this shouldn't be restricted to Function
    public arguments = new Array<Expr>();

    public constructor(ast: Node, target: Function){
        this.ast = ast;
        this.target = target;
    }

    public checkTypes(compiler: Compiler): boolean {
        let result = true;

        for(const argument of this.arguments){
            // Use temporary variable to avoid short-circuiting behavior of &&
            const argResult = argument.checkTypes(compiler);
            result = result && argResult;
        }

        if(canMonomorphize(this.target)){
            compiler.callsToMonomorphize.push(this);
        }

        return result;
    }
}

export class Constant implements IThing, IExpr {
    public ast: any;
    public tag: Tag.Constant = Tag.Constant;

    public resultType: Type | undefined;
    public value: any;

    public constructor(ast: Node, type: Type, value: any){
        this.ast = ast;
        this.resultType = type;
        this.value = value;
    }

    public checkTypes(compiler: Compiler): boolean {
        return true;
    }
}

export class Construct implements IThing, IExpr {
    public ast: Node;

    public tag: Tag.Construct = Tag.Construct;

    public resultType: Type | undefined;

    public target: Type;
    public arguments = Array<Expr>();

    public constructor(ast: Node, target: Type){
        this.ast = ast;
        this.target = target;
    }

    public checkTypes(compiler: Compiler): boolean {
        throw new Error('Method not implemented.');
    }
}

export class Return implements IThing, IExpr {
    public ast: Node;

    public tag: Tag.Return = Tag.Return;

    public resultType: Type | undefined;
    public value: Expr;

    public constructor(ast: Node, value: Expr){
        this.ast = ast;

        this.value = value;
        this.resultType = value.resultType;
    }

    public checkTypes(compiler: Compiler): boolean {
        return this.value.checkTypes(compiler);
    }
}

export class GetVariable implements IThing, IExpr {
    public ast: any;
    public tag: Tag.GetVariable = Tag.GetVariable;

    public resultType: Type | undefined;
    public variable: Variable;

    public constructor(ast: Node, variable: Variable){
        this.ast = ast;
        this.variable = variable;
        this.resultType = variable.type;
    }

    public checkTypes(compiler: Compiler): boolean {
        return true;
    }
}

export class GetField implements IThing, IExpr {
    public ast: any;
    public tag: Tag.GetField = Tag.GetField;

    public resultType: Type | undefined;

    public target: Expr;
    public field: Variable;

    public constructor(ast: Node, target: Expr, field: Variable){
        this.ast = ast;

        this.target = target;
        this.field = field;
    }

    public checkTypes(compiler: Compiler): boolean {
        // Assume that this.field is already checked
        return this.target.checkTypes(compiler);
    }
}

export class SetVariable implements IThing {
    public ast: any;
    public tag: Tag.SetVariable = Tag.SetVariable;

    public target: Variable;
    public source: Expr;

    public constructor(ast: Node, target: Variable, source: Expr){
        this.ast = ast;

        this.target = target;
        this.source = source;
    }

    public checkTypes(compiler: Compiler){
        let result = true;

        // result = result && this.target.checkTypes(compiler);

        // TODO: Type check constants - Blocked because constants do not currently have types
        if(this.target.type !== this.source.resultType && this.source.tag !== Tag.Constant){
            compiler.error("Bad type", [], []);
            result = false;
        }

        // Use temporary variable to avoid short-circuiting behavior of &&
        let temp = this.source.checkTypes(compiler);
        result = result && temp;

        return result;
    }
}

export class SetField implements IThing {
    public ast: any;
    public tag: Tag.SetField = Tag.SetField;

    public target: Expr;
    public field: Variable;
    public source: Expr;

    public constructor(ast: Node, target: Expr, field: Variable, source: Expr){
        this.ast = ast;

        this.target = target;
        this.field = field;
        this.source = source;
    }

    public checkTypes(compiler: Compiler): boolean {
        let result = true;

        result = result && this.target.checkTypes(compiler);

        // TODO: Remove this hack, poison values instead
        if(this.field !== undefined){
            if(this.field.type !== this.source.resultType && this.source.tag !== Tag.Constant){
                compiler.error("Bad type", [], [this.source.ast[0]]);
                result = false;
            }
        }

        result = result && this.source.checkTypes(compiler);

        return result;
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