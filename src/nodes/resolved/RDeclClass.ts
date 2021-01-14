import { RNode } from './RNode';
import { RTag } from './RTag';
import { RType } from './RType';

export class RDeclClass {
    public static readonly tag = RTag.DeclClass;
    public readonly tag = RTag.DeclClass;

    public name: string;
    public superTypes: Array<RType>;
    public members: Array<RNode>;

    public constructor(
        name: string,
        superTypes = new Array<RType>(),
        members    = new Array<RNode>(),
    ) {
        this.name = name;
        this.superTypes = superTypes;
        this.members = members;
    }
}