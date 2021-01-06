import { RTag } from './RTag';
import { RType } from './RType';

export class RDeclClass {
    public static readonly tag = RTag.DeclClass;
    public readonly tag = RTag.DeclClass;

    public readonly name: string;
    public readonly superTypes: RType[];
    // TODO: Attributes
    public readonly members = new Map<string, RType>();

    public constructor(
        name: string,
    ) {
        this.name = name;
        this.superTypes = [];
    }
}