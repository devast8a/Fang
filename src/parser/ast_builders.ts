import { Parser } from './parser';


export enum Tag {
    DeclClass,
    DeclFunction,
    DeclVariable,
}

export type Node =
    | DeclClass
    | DeclFunction
    | DeclVariable
    ;




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

    body = body.map((node: any) => parser.parse(node));

    return new DeclFunction(name, body);
}






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