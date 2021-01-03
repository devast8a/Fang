import { UTag } from "./UTag";
import { UDeclParameter } from './UDeclParameter';
import { UNode } from './UNode';

export class UDeclFunction {
    public static readonly tag = UTag.DeclFunction;
    public readonly tag = UTag.DeclFunction;

    public readonly name: string;
    public readonly compileTime: boolean;
    public readonly parameters: ReadonlyArray<UDeclParameter>;
    public readonly returnType: UNode | null;
    public readonly body: ReadonlyArray<UNode>;

    public constructor(
        name: string,
        compileTime: boolean,
        parameters: ReadonlyArray<UDeclParameter>,
        returnType: UNode | null,
        // TODO: Generics
        // TODO: Attributes
        body: ReadonlyArray<UNode>
    ) {
        this.name = name;
        this.compileTime = compileTime;
        this.parameters = parameters;
        this.returnType = returnType;
        this.body = body;
    }
}
