import { RExpr } from './RExpr';
import { RTag } from './RTag';

export class RStmtReturn {
    public static readonly tag = RTag.StmtReturn;
    public readonly tag = RTag.StmtReturn;

    public value: RExpr | null;

    public constructor(value: RExpr | null = null) {
        this.value = value;
    }
}