import { RExpr } from './RExpr';
import { RNode } from './RNode';
import { RTag } from './RTag';

export class RStmtIfCase {
    public static readonly tag = RTag.StmtIfCase;
    public readonly tag = RTag.StmtIfCase;

    public condition: RExpr;
    public body: RNode[];

    public constructor(
        condition: RExpr,
        body: RNode[]
    ) {
        this.condition = condition;
        this.body = body;
    }
}