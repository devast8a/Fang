import { UTag } from "./UTag";
import { UNode } from "./UNode";

export class UExprMacroCall {
    public static readonly tag = UTag.ExprMacroCall;
    public readonly tag = UTag.ExprMacroCall;

    public readonly target: string;
    public readonly argument: UNode; // TODO: Support multiple argument macro calls

    public constructor(
        target: string,
        argument: UNode,
    ) {
        this.target = target;
        this.argument = argument;
    }
}
