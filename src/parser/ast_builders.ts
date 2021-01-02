import { compile } from 'moo';
import { VariableFlags } from '../ast/things';
import { Builder, Parser } from './parser';
import { PTag } from './post_processor';

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
    ExprUnaryPostfix,
    ExprUnaryPrefix,
    LiteralString,
    LiteralIntegerBin,
    LiteralIntegerDec,
    LiteralIntegerHex,
    LiteralIntegerOct,
    ExprGetLocal,
    DeclParameter
}

export type Node =
    | DeclClass
    | DeclFunction
    | DeclVariable
    | ExprCall
    | GetLocal
    | DeclParameter
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

export class GetLocal {
    public static readonly tag = Tag.ExprGetLocal;
    public readonly tag = Tag.ExprGetLocal;

    public name: string;

    public constructor(
        name: string
    ){
        this.name = name;
    }
}

export class DeclParameter {
    public static readonly tag = Tag.DeclParameter;
    public readonly tag = Tag.DeclParameter;

    public flags: VariableFlags;
    public name: string;
    public compileTime: boolean;
    public type: Node | null; // TODO: Replace with Type?
    // TODO: Attributes
    public value: Node | null;

    constructor(
        flags: VariableFlags,
        name: string,
        compileTime: boolean,
        type: Node | null,
        // TODO: Attributes
        value: Node | null,
    ){
        this.flags = flags;
        this.name = name;
        this.compileTime = compileTime;
        this.type = type;
        this.value = value;
    }
}

////////////////////////////////////////////////////////////////////////////////////////////////////
export const Main = new Parser();
Main.register(PTag.DeclClass, (node) => {
    const name = node[1].value;

    return new DeclClass(name);
});

Main.register(PTag.DeclFunction, (node, parser) => {
    const name       = node[1].value;
    const parameters = node[3].elements.map((node: any) => parser.parse(node));
    const body       = node[7]?.[1].elements.map((node: any) => parser.parse(node));

    return new DeclFunction(name, body);
});

Main.register(PTag.DeclVariable, (node) => {
    // TODO: Properly handle compile time and attributes
    const keyword     = node[0][0].text;
    const name        = node[1].value;
    const compileTime = node[2] != null;
    //const type        = parser.parse(tree[2]?.[3]);
    //const attributes  = parser.parse(tree[3]);
    //const value       = parser.parse(tree[4]);

    return new DeclVariable(name, null, null);
});

Main.register(PTag.ExprCall, (node) => {
    const target      = undefined as any;
    const compileTime = node[1] !== null;
    const args        = node[2].elements.map((x: any) => Expr.parse(x));

    return new ExprCall(target, args);
});

function parameterToFlags(keyword: string | null | undefined){
    switch(keyword){
        case undefined: return null;
        case null:  return null;
        case "own": return VariableFlags.Owns;
        case "mut": return VariableFlags.Mutates;
        default: throw new Error(`Unknown parameter keyword ${keyword}`)
    }
}

Main.register(PTag.DeclParameter, (node) => {
    const flags       = parameterToFlags(node[0]?.[0]?.value) ?? VariableFlags.None;
    const name        = node[1].value;
    const compileTime = node[2] !== null;
    const type        = TypeExpr.parse(node[3]?.[3]);
    // TODO: Attributes
    const value       = Expr.parse(node[4]?.[3]);

    return new DeclParameter(flags, name, compileTime, type, value);
});

export const Expr = new Parser();
Expr.register(PTag.ExprIdentifier, (node) => {
    const name = node[0].value;

    return new GetLocal(name);
});

export const TypeExpr = new Parser();
TypeExpr.register(PTag.ExprIdentifier, (node) => {
    return "" as any;
});