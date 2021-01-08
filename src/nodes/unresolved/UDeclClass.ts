import { UTag } from "./UTag";
import { UNode } from "./UNode";
import { UType } from './UType';

export class UDeclClass {
    public static readonly tag = UTag.DeclClass;
    public readonly tag = UTag.DeclClass;

    public readonly name: string;
    public readonly superTypes: ReadonlyArray<UType>;
    // TODO: Generics
    // TODO: Attributes
    public readonly body: ReadonlyArray<UNode>;

    public constructor(
        name: string,
        superTypes: ReadonlyArray<UType>,
        body: ReadonlyArray<UNode>
    ) {
        this.name = name;
        this.superTypes = superTypes;
        this.body = body;
    }
}
