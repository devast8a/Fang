import { VariableFlags } from '../../ast/things';
import { UTag } from "./UTag";
import { UNode } from "./UNode";


export class UDeclParameter {
    public static readonly tag = UTag.DeclParameter;
    public readonly tag = UTag.DeclParameter;

    public readonly flags: VariableFlags;
    public readonly name: string;
    public readonly compileTime: boolean;
    public readonly type: UNode | null; // TODO: Replace with Type?
    // TODO: Attributes
    public readonly value: UNode | null;

    constructor(
        flags: VariableFlags,
        name: string,
        compileTime: boolean,
        type: UNode | null,
        // TODO: Attributes
        value: UNode | null
    ) {
        this.flags = flags;
        this.name = name;
        this.compileTime = compileTime;
        this.type = type;
        this.value = value;
    }
}