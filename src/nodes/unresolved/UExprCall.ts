import { UNode } from './UNode';
import { UTag } from './UTag';

export class UExprCall {
    public static readonly tag = UTag.ExprCall;
    public readonly tag = UTag.ExprCall;

    public readonly target: UNode;
    public readonly args: ReadonlyArray<UNode>;

    public constructor(
        target: UNode,
        args: ReadonlyArray<UNode>
    ) {
        this.target = target;
        this.args = args;
    }
}
