import { RNode } from './RNode';
import { RTag } from './RTag';
import { RType } from './RType';


export class RDeclTrait {
    public static readonly tag = RTag.DeclTrait;
    public readonly tag = RTag.DeclTrait;

    public name: string;
    public superTypes: Array<RType>;
    public members: Array<RNode>;

    public constructor(
        name: string,
        superTypes = new Array<RType>(),
        members = new Array<RNode>()
    ) {
        this.name = name;
        this.superTypes = superTypes;
        this.members = members;
    }
}
