import { RDeclVariable } from './RDeclVariable';
import { RNode } from './RNode';
import { RTag } from './RTag';
import { RType } from './RType';

export class RDeclFunction {
    public static readonly tag = RTag.DeclFunction;
    public readonly tag = RTag.DeclFunction;

    public name: string;
    public compileTime: boolean;
    public returnType: RType;
    public parameters: Array<RDeclVariable>;
    public body: Array<RNode>;

    constructor(
        name: string,
        returnType: RType,
        parameters: Array<RDeclVariable>,
        compileTime = false,
        body = new Array<RNode>()
    ) {
        this.name = name;
        this.compileTime = compileTime;
        this.returnType = returnType;
        this.parameters = parameters;
        this.body = body;
    }
}