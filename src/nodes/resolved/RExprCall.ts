import { RDeclFunction } from './RDeclFunction';
import { RExpr } from './RExpr';
import { RTag } from './RTag';
import { RType } from './RType';

// A call expression, that calls a method on an object
//  The bar in foo.bar(1, "Hello World!", 2.3)
export class RExprCall {
    public static readonly tag = RTag.ExprCallField;
    public readonly tag = RTag.ExprCallField;

    public get resultType(): RType {
        return undefined as any;
    }

    public args: Array<RExpr>;

    public constructor(
        target: RExpr,
        args: Array<RExpr>,
    ) {
        this.args = args;
    }
}