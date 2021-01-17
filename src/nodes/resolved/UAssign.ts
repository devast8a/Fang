import { UExpr } from './UExpr';
import { RTag } from './RTag';

export class UExprAssign {
    public static readonly tag = RTag.UExprAssign;
    public readonly tag = RTag.UExprAssign;

    public target: UExpr;
    public value: UExpr;

    public constructor(
        target: UExpr,
        value: UExpr,
    ) {
        this.target = target;
        this.value = value;
    }
}