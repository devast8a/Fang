import { VariableFlags } from '../VariableFlags';
import { RNode } from './RNode';
import { RTag } from './RTag';
import { RType } from './RType';

export class RDeclVariable {
    public static readonly tag = RTag.DeclVariable;
    public readonly tag = RTag.DeclVariable;

    public readonly flags: VariableFlags;
    public readonly name: string;
    public readonly compileTime: boolean;
    public readonly type: RType | null; // Should we even allow this to be null at this point?
    // TODO: Attributes
    public readonly value: RNode | null;

    constructor(
        flags: VariableFlags,
        name: string,
        compileTime: boolean,
        type: RType | null,
        // TODO: Attributes
        value: RNode | null
    ) {
        this.flags = flags;
        this.name = name;
        this.compileTime = compileTime;
        this.type = type;
        this.value = value;
    }
}
