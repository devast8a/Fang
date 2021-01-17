import { UExpr } from './UExpr';
import { RTag } from './RTag';

export class UExprCall {
    public static readonly tag = RTag.UExprCall;
    public readonly tag = RTag.UExprCall;

    public target: UExpr;
    public args: Array<UExpr>;
    public compileTime: boolean;

    public constructor(
        target: UExpr,
        args: Array<UExpr>,
        compileTime = false,
    ) {
        this.target = target;
        this.args = args;
        this.compileTime = compileTime;
    }
}