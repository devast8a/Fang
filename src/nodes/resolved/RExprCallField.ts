import { RDeclFunction } from './RDeclFunction';
import { RExpr } from './RExpr';
import { RTag } from './RTag';
import { RType } from './RType';

// A call expression, that calls a method on an object
//  The bar in foo.bar(1, "Hello World!", 2.3)
export class RExprCallField {
    public static readonly tag = RTag.ExprCallField;
    public readonly tag = RTag.ExprCallField;

    public get resultType(): RType {
        return this.target.returnType;
    }

    public readonly object: RExpr;
    public readonly target: RDeclFunction;
    public readonly args: ReadonlyArray<RExpr>;

    public constructor(
        object: RExpr,
        target: RDeclFunction,
        args: ReadonlyArray<RExpr>,
    ) {
        this.object = object;
        this.target = target;
        this.args = args;
    }
}