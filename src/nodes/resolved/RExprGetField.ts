import { RDeclVariable } from './RDeclVariable';
import { RExpr } from './RExpr';
import { RTag } from './RTag'
import { RType } from './RType';

export class RExprGetField {
    public static readonly tag = RTag.ExprGetField;
    public readonly tag = RTag.ExprGetField;

    public get resultType(): RType {
        return this.field.type;
    }

    public readonly object: RExpr;
    public readonly field: RDeclVariable;

    public constructor(
        object: RExpr,
        field: RDeclVariable,
    ) {
        this.object = object;
        this.field = field;
    }
}
