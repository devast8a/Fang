import { RDeclVariable } from './RDeclVariable';
import { RTag } from './RTag';
import { RType } from './RType';

export class RExprGetLocal {
    public static readonly tag = RTag.ExprGetLocal;
    public readonly tag = RTag.ExprGetLocal;

    public get resultType(): RType {
        return this.local.type;
    }

    public local: RDeclVariable;

    public constructor(
        local: RDeclVariable
    ) {
        this.local = local;
    }
}
