import { RExpr } from './RExpr';
import { RNode } from './RNode';
import { RTag } from './RTag';


export class RStmtIf {
    public static readonly tag = RTag.StmtIf;
    public readonly tag = RTag.StmtIf;

    public cases: Array<RStmtIfCase>;
    public final: Array<RNode>;

    public constructor(
        cases: Array<RStmtIfCase>,
        final: Array<RNode>
    ) {
        this.cases = cases;
        this.final = final;
    }
}

export class RStmtIfCase {
    public static readonly tag = RTag.StmtIfCase;
    public readonly tag = RTag.StmtIfCase;

    public condition: RExpr;
    public body: RNode[];

    public constructor(
        condition: RExpr,
        body: RNode[],
    ) {
        this.condition = condition;
        this.body = body;
    }
}