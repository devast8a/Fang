import { RExpr } from './RExpr';
import { RNode } from './RNode';
import { RTag } from './RTag';

export class RStmtWhile {
    public static readonly tag = RTag.StmtWhile;
    public readonly tag = RTag.StmtWhile;

    public condition: RExpr;
    public body: Array<RNode>;

    public constructor(
        condition: RExpr,
        body: Array<RNode>,
    ) {
        this.condition = condition;
        this.body = body;
    }
}