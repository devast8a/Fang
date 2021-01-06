import { UTag } from "./UTag";
import { UNode } from './UNode';
import { UDeclVariable } from './UDeclVariable';

export class UDeclFunction {
    public static readonly tag = UTag.DeclFunction;
    public readonly tag = UTag.DeclFunction;

    public readonly name: string;
    public readonly compileTime: boolean;
    public readonly parameters: ReadonlyArray<UDeclVariable>;
    public readonly returnType: UNode | null;
    public readonly body: ReadonlyArray<UNode>;

    public constructor(
        name: string,
        compileTime: boolean,
        parameters: ReadonlyArray<UDeclVariable>,
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
