import { UNode } from './UNode';
import { UTag } from './UTag';
import { UType } from './UType';

export class UDeclTrait {
    public static readonly tag = UTag.DeclTrait;
    public readonly tag = UTag.DeclTrait;

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
