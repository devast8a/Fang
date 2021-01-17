import { RDeclVariable } from './RDeclVariable';
import { RExpr } from './RExpr';
import { RTag } from './RTag';
import { RType } from './RType';

export class RExprSetLocal {
    public static readonly tag = RTag.ExprSetLocal;
    public readonly tag = RTag.ExprSetLocal;

    public get resultType(): RType {
        return this.local.type;
    }

    public local: RDeclVariable;
    public value: RExpr;

    public constructor(
        local: RDeclVariable,
        value: RExpr,
    ) {
        this.local = local;
        this.value = value;
    }
}
