import { RDeclFunction } from './RDeclFunction';
import { RTag } from './RTag';
import { RType } from './RType';
import { RExpr } from './RExpr';

export class RExprCallStatic {
    public static readonly tag = RTag.ExprCallStatic;
    public readonly tag = RTag.ExprCallStatic;

    public get resultType(): RType {
        return this.target.returnType;
    }

    public readonly target: RDeclFunction;
    public readonly args: ReadonlyArray<RExpr>;

    public constructor(
        target: RDeclFunction,
        args: ReadonlyArray<RExpr>
    ) {
        this.target = target;
        this.args = args;
    }
}