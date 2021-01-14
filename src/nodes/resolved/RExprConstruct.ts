import { RTag } from './RTag';
import { RType } from './RType';
import { RExpr } from './RExpr';

// A construction expression with a globally known target type
//  The Foo in Foo{1, "Hello World!", 2.3}
export class RExprConstruct {
    public static readonly tag = RTag.ExprConstruct;
    public readonly tag = RTag.ExprConstruct;

    public get resultType(): RType {
        return this.target;
    }

    public target: RType;
    public args: Array<RExpr>;

    public constructor(
        target: RType,
        args: Array<RExpr>
    ) {
        this.target = target;
        this.args = args;
    }
}