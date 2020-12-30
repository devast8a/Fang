import { Parser } from './parser';

/**
 * Current as of 2020-12-31 - devast8a
 * 
 * This file is currently performing many roles
 * - A list of Tags, used to identify the output of the parser
 * - A list of Nodes, an abstract representation of programs before name-resolution has completed
 * - Implementation for each of the Nodes
 * - Implementation for builders that convert parser output into a specific node
 * - Links tags to appropriate builders
 */
// TODO: Separate concerns of this file - See above comment

export enum Tag {
    DeclClass,
    DeclFunction,
    DeclVariable,
    ExprCall,
    ExprBinary,
    ExprUnary,
}

export type Node =
    | DeclClass
    | DeclFunction
    | DeclVariable
    | ExprCall
    ;

////////////////////////////////////////////////////////////////////////////////////////////////////
export class DeclVariable {
    public static readonly tag = Tag.DeclVariable;
    public readonly tag = Tag.DeclVariable;

    public name: string;
    public type: Node | null;
    public value: Node | null

    public constructor(
        name: string,
        type: Node | null,
        value: Node | null,
    ){
        this.name = name;
        this.type = type;
        this.value = value;
    }
}
export function DeclVariableBuilder(parser: Parser, tree: any[]){
    // TODO: Properly handle compile time and attributes
    const keyword     = tree[0][0].text;
    const name        = tree[1][0].value;
    const compileTime = tree[1][1] != null;
    //const type        = parser.parse(tree[2]?.[3]);
    //const attributes  = parser.parse(tree[3]);
    //const value       = parser.parse(tree[4]);

    return new DeclVariable(name, null, null);
}

////////////////////////////////////////////////////////////////////////////////////////////////////
export class DeclFunction {
    public static readonly tag = Tag.DeclFunction;
    public readonly tag = Tag.DeclFunction;

    public name: string;
    public body: Node[];

    public constructor(
        name: string,
        body: Node[],
    ){
        this.name = name;
        this.body = body;
    }
}
export function DeclFunctionBuilder(parser: Parser, tree: any[]){
    const name = tree[1][0].value;
    let body = tree[6]?.[1].elements;

    if(body !== null){
        body = body.map((node: any) => parser.parse(node));
    }

    return new DeclFunction(name, body);
}

////////////////////////////////////////////////////////////////////////////////////////////////////
export class DeclClass {
    public static readonly tag = Tag.DeclClass;
    public readonly tag = Tag.DeclClass;

    public name: string;

    public constructor(
        name: string,
    ){
        this.name = name;
    }
}
export function DeclClassBuilder(parser: Parser, tree: any[]) {
    const name = tree[1].value;

    return new DeclClass(name);
}

////////////////////////////////////////////////////////////////////////////////////////////////////
export class ExprCall {
    public static readonly tag = Tag.ExprCall;
    public readonly tag = Tag.ExprCall;

    public target: Node;
    public args: Node[];

    public constructor(
        target: Node,
        args: Node[],
    ){
        this.target = target;
        this.args   = args;
    }
}
export function ExprCallBuilder(parser: Parser, tree: any[]){
    // TODO: Parse expr properly
    const target      = undefined as any;
    const compileTime = tree[0][1] !== null;
    const args        = tree[1].elements;

    return new ExprCall(target, args);
}

////////////////////////////////////////////////////////////////////////////////////////////////////
export const parserMain = new Parser();
parserMain.registerBuilderToTag(Tag.DeclClass, DeclClassBuilder);
parserMain.registerBuilderToTag(Tag.DeclFunction, DeclFunctionBuilder);
parserMain.registerBuilderToTag(Tag.DeclVariable, DeclVariableBuilder);
parserMain.registerBuilderToTag(Tag.ExprCall, ExprCallBuilder);