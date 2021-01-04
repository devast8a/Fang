import { RDeclParameter } from './RDeclParameter';
import { RTag } from './RTag';
import { RType } from './RType';

export class RDeclFunction {
    public static readonly tag = RTag.DeclFunction;
    public readonly tag = RTag.DeclFunction;

    public readonly name: string;
    public readonly returnType: RType;
    public readonly parameters: ReadonlyArray<RDeclParameter>;

    constructor(
        name: string,
        returnType: RType,
        parameters: ReadonlyArray<RDeclParameter>,
    ) {
        this.name = name;
        this.returnType = returnType;
        this.parameters = parameters;
    }
}