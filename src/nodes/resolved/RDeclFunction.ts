import { RDeclVariable } from './RDeclVariable';
import { RNode } from './RNode';
import { RTag } from './RTag';
import { RType } from './RType';

export class RDeclFunction {
    public static readonly tag = RTag.DeclFunction;
    public readonly tag = RTag.DeclFunction;

    public readonly name: string;
    public readonly compileTime: boolean;
    public readonly returnType: RType;
    // TODO: Attributes
    public readonly parameters: ReadonlyArray<RDeclVariable>;
    public readonly body: ReadonlyArray<RNode>;

    constructor(
        name: string,
        returnType: RType,
        parameters: ReadonlyArray<RDeclVariable>,
    ) {
        this.name = name;
        this.compileTime = false;
        this.returnType = returnType;
        this.parameters = parameters;
        this.body = [];
    }
}