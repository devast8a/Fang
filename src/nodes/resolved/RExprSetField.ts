import { RDeclVariable } from './RDeclVariable';
import { RExpr } from './RExpr';
import { RTag } from './RTag'
import { RType } from './RType';

export class RExprSetField {
    public static readonly tag = RTag.ExprSetField;
    public readonly tag = RTag.ExprSetField;

    public get resultType(): RType {
        return this.field.type;
    }

    public object: RExpr;
    public field: RDeclVariable;
    public value: RExpr;

    public constructor(
        object: RExpr,
        field: RDeclVariable,
        value: RExpr,
    ) {
        this.object = object;
        this.field = field;
        this.value = value;
    }
}
