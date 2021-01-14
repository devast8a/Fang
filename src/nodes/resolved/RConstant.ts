import { RTag } from './RTag';
import { RType } from './RType';

export class RConstant {
    public static readonly tag = RTag.StmtReturn;
    public readonly tag = RTag.StmtReturn;

    public get resultType(): RType {
        return this.type;
    }

    public value: any;
    public type: RType;

    public constructor(
        value: any,
        type: RType,
    ) {
        this.value = value;
        this.type = type;
    }
}