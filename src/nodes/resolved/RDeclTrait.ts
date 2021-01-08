import { RTag } from './RTag';
import { RType } from './RType';


export class RDeclTrait {
    public static readonly tag = RTag.DeclTrait;
    public readonly tag = RTag.DeclTrait;

    public readonly name: string;
    public readonly superTypes = new Array<RType>();
    // TODO: Attributes
    public readonly members = new Array<RType>();

    public constructor(
        name: string
    ) {
        this.name = name;
    }
}
