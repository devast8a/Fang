import { RTag } from './RTag';
import { RType } from './RType';


export class RDeclTrait {
    public static readonly tag = RTag.DeclTrait;
    public readonly tag = RTag.DeclTrait;

    public readonly name: string;
    public readonly superTypes: Map<string, RDeclTrait>;
    // TODO: Attributes
    public readonly members = new Map<string, RType>();

    public constructor(
        name: string
    ) {
        this.name = name;
        this.superTypes = new Map;
    }
}
