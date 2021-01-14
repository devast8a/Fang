import { RTag } from './RTag';
import { RType } from './RType';


export class RDeclTrait {
    public static readonly tag = RTag.DeclTrait;
    public readonly tag = RTag.DeclTrait;

    public name: string;
    public superTypes = new Array<RType>();
    // TODO: Attributes
    public members = new Array<RType>();

    public constructor(
        name: string,
        superTypes = new Array<RType>(),
        members = new Array<RType>()
    ) {
        this.name = name;
    }
}
