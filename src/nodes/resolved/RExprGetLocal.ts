import { RDeclVariable } from './RDeclVariable';
import { RTag } from './RTag';
import { RType } from './RType';

export class RExprGetLocal {
    public static readonly tag = RTag.ExprGetLocal;
    public readonly tag = RTag.ExprGetLocal;

    public get resultType(): RType {
        // TODO: Sort out RDeclField's null type
        return this.local.type!;
    }

    public readonly local: RDeclVariable;

    public constructor(
        local: RDeclVariable
    ) {
        this.local = local;
    }
}
