import { RDeclVariable } from './RDeclVariable';
import { RExpr } from './RExpr';
import { RTag } from './RTag';
import { RType } from './RType';

export class RExprSetLocal {
    public static readonly tag = RTag.ExprGetLocal;
    public readonly tag = RTag.ExprGetLocal;

    public get resultType(): RType {
        // TODO: Sort out RDeclField's null type
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
