import { RTag } from './RTag';
import { RType } from './RType';

export class RExprConstant {
    public static readonly tag = RTag.ExprConstant;
    public readonly tag = RTag.ExprConstant;

    public get resultType(): RType {
        return this.type;
    }

    public type: RType;
    public value: any;

    public constructor(
        type: RType,
        value: any
    ) {
        this.type = type;
        this.value = value;
    }
}