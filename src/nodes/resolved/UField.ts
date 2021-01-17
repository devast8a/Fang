import { RTag } from './RTag';
import { UExpr } from './UExpr';

export class UExprField {
    public static readonly tag = RTag.UExprField;
    public readonly tag = RTag.UExprField;
    
    public target: UExpr;
    public field: string;

    public constructor(
        target: UExpr,
        field: string
    ) {
        this.target = target;
        this.field = field;
    }
}

