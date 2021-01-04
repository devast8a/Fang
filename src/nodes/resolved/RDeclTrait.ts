import { RTag } from './RTag';


export class RDeclTrait {
    public static readonly tag = RTag.DeclTrait;
    public readonly tag = RTag.DeclTrait;

    public name: string;
    public superTypes: Map<string, RDeclTrait>;

    public constructor(
        name: string
    ) {
        this.name = name;
        this.superTypes = new Map;
    }
}
