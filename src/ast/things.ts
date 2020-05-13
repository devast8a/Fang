import { Scope } from './scope';

export enum Tag {
    Block,
    CallField,
    CallStatic,
    Class,
    Constant,
    Construct,
    Function,
    GetField,
    GetType,
    GetVariable,
    If,
    Poison,
    Return,
    SetField,
    SetVariable,
    Trait,
    Variable,
}
export const TagCount = Math.max(...Object.values(Tag).filter(x => typeof(x) === 'number') as number[]) + 1;

// TODO: Make the parser strongly typed
type Node = any;

interface IThing {
    ast: Node;

    tag: Tag;

    visit(next: Thing[]): void;
}
export type Thing =
      Block
    | Class
    | CallField
    | CallStatic
    | Constant
    | Construct
    | Function
    | GetField
    | GetType
    | GetVariable
    | If
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
    | GetType
    | GetVariable;

interface IStmt {
}
export type Stmt =
      CallField
    | CallStatic
    | If
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

    public visit(next: Thing[]) {
        for(const thing of this.members.values()){
            next.push(thing);
        }
    }
}

export class Function implements IThing, IType {
    public ast: Node;
    public tag: Tag.Function = Tag.Function;
    public static tag: Tag.Function = Tag.Function;

    public name: string;
    public id: string;

    public returnType: Type | undefined = undefined;
    public parameters = new Array<Variable>();
    public body = new Block();

    public scope: Scope;

    public constructor(
        ast: Node,
        name: string,
        id: string,
        parentScope: Scope,
    ){
        this.scope = new Scope(parentScope.id + "F" + name + "_", parentScope);

        this.ast = ast;
        this.name = name;
        this.id = id;
    }

    public visit(next: Thing[]) {
        for(const thing of this.parameters){
            next.push(thing);
        }

        next.push(this.body);
    }
}

export class Trait implements IThing, IType {
    public ast: Node;
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

    public visit(next: Thing[]) {
        for(const thing of this.members.values()){
            next.push(thing);
        }
    }
}

export enum VariableFlags {
    None    = 0,
    Local   = 1 << 0,
    Mutates = 1 << 1,
    Owns    = 1 << 2,
}

export class Variable implements IThing, IType {
    public ast: Node;
    public tag: Tag.Variable = Tag.Variable;
    public static tag: Tag.Variable = Tag.Variable;

    public name: string;
    public id: string;

    public type: Type;
    public value: Expr | undefined;
    public flags: VariableFlags;

    public constructor(ast: Node, name: string, type: Type, flags: VariableFlags, id: string){
        this.ast = ast;
        this.name = name;
        this.id = id;
        this.type = type;
        this.flags = flags;
    }

    public visit(next: Thing[]) {
        if(this.value){
            next.push(this.value);
        }
    }
}

export class CallField implements IThing, IExpr {
    public ast: Node;
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

    public visit(next: Thing[]) {
        next.push(this.expression);

        for(const thing of this.arguments){
            next.push(thing);
        }
    }
}

export class CallStatic implements IThing, IExpr {
    public ast: Node;
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

    public visit(next: Thing[]) {
        for(const thing of this.arguments){
            next.push(thing);
        }
    }
}

export class Constant implements IThing, IExpr {
    public ast: Node;
    public tag: Tag.Constant = Tag.Constant;
    public static tag: Tag.Constant = Tag.Constant;

    public expressionResultType: Type | undefined;
    public value: any;

    public constructor(ast: Node, type: Type, value: any){
        this.ast = ast;
        this.expressionResultType = type;
        this.value = value;
    }

    public visit(next: Thing[]) {}
}

export class Construct implements IThing, IExpr {
    public ast: Node;
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

    public visit(next: Thing[]) {
        for(const thing of this.arguments){
            next.push(thing);
        }
    }
}

export class Return implements IThing, IExpr {
    public ast: Node;
    public tag: Tag.Return = Tag.Return;
    public static tag: Tag.Return = Tag.Return;

    public expressionResultType: Type | undefined;
    public value: Expr;

    public constructor(ast: Node, value: Expr){
        this.ast = ast;

        this.value = value;
        this.expressionResultType = value.expressionResultType;
    }

    public visit(next: Thing[]) {
        next.push(this.value);
    }
}

export class GetType implements IThing, IExpr {
    public ast: Node;
    public tag: Tag.GetType = Tag.GetType;
    public static tag: Tag.GetType = Tag.GetType;

    public expressionResultType: Type | undefined;
    public type: Type;

    public constructor(ast: Node, type: Type){
        this.type = type;
        this.expressionResultType = type;
    }

    public visit(next: Thing[]) {}
}

export class GetVariable implements IThing, IExpr {
    public ast: Node;
    public tag: Tag.GetVariable = Tag.GetVariable;
    public static tag: Tag.GetVariable = Tag.GetVariable;

    public expressionResultType: Type | undefined;
    public variable: Variable;

    public constructor(ast: Node, variable: Variable){
        this.ast = ast;
        this.variable = variable;
        this.expressionResultType = variable.type;
    }

    public visit(next: Thing[]) {}
}

export class GetField implements IThing, IExpr {
    public ast: Node;
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

    public visit(next: Thing[]) {
        next.push(this.target);
    }
}

export class SetVariable implements IThing {
    public ast: Node;
    public tag: Tag.SetVariable = Tag.SetVariable;
    public static tag: Tag.SetVariable = Tag.SetVariable;

    public target: Variable;
    public source: Expr;

    public constructor(ast: Node, target: Variable, source: Expr){
        this.ast = ast;

        this.target = target;
        this.source = source;
    }

    public visit(next: Thing[]) {
        next.push(this.source);
    }
}

export class SetField implements IThing {
    public ast: Node;
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

    public visit(next: Thing[]) {
        next.push(this.target);
        next.push(this.source);
    }
}

export class Case {
    public condition: Expr;
    public body: Block;

    public constructor(condition: Expr, body: Block){
        this.condition = condition;
        this.body = body;
    }
}

export class If implements IThing {
    public ast: any;
    public tag: Tag.If = Tag.If;
    public static tag: Tag.If = Tag.If;

    public cases: Case[];
    public defaultCase: Block;

    public constructor(ast: Node, cases: Case[], defaultCase: Block){
        this.ast = ast;
        this.cases = cases;
        this.defaultCase = defaultCase;
    }

    public visit(next: Thing[]) {
        for(const c of this.cases){
            next.push(c.condition);
            next.push(c.body);
        }

        next.push(this.defaultCase);
    }
}

export class Block implements IThing {
    public ast: any;
    public tag: Tag.Block = Tag.Block;
    public static tag: Tag.Block = Tag.Block;

    public block: Stmt[];

    public constructor(block?: Stmt[]){
        this.ast = null;
        this.block = block === undefined ? [] : block;
    }

    public visit(next: Thing[]) {
        for(const stmt of this.block){
            next.push(stmt);
        }
    }
}