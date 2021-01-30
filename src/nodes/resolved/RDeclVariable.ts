import { RExpr } from './RExpr';
import { RTag } from './RTag';
import { RType } from './RType';

export class RDeclVariable {
    public static readonly tag = RTag.DeclVariable;
    public readonly tag = RTag.DeclVariable;

    public flags: VariableFlags;
    public name: string;
    public compileTime: boolean;
    public type: RType;
    public value: RExpr | null;

    constructor(
        name: string,
        type: RType,
        flags               = VariableFlags.None,
        compileTime         = false,
        value: RExpr | null = null,
    ) {
        this.flags       = flags;
        this.name        = name;
        this.compileTime = false;
        this.type        = type;
        this.value       = value;
    }
}

export enum VariableFlags {
    None    = 0,
    Local   = 1 << 0,
    Mutates = 1 << 1,
    Owns    = 1 << 2,
}