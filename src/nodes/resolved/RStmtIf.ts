import { RNode } from './RNode';
import { RStmtIfCase } from './RStmtIfCase';
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