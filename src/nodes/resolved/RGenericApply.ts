import { RGeneric } from './RGeneric';
import { RTag } from './RTag';
import { RType } from './RType';


export class RGenericApply<T> {
    public static readonly tag = RTag.GenericApply;
    public readonly tag = RTag.GenericApply;

    public generic: RGeneric<T>;
    public args: Array<RType>;

    public constructor(
        generic: RGeneric<T>,
        args: Array<RType>
    ) {
        this.generic = generic;
        this.args = args;
    }
}
