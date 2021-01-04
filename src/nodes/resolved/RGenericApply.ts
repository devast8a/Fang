import { RGeneric } from './RGeneric';
import { RNode } from './RNode';
import { RTag } from './RTag';
import { RType } from './RType';


export class RGenericApply<T extends RNode> {
    public static readonly tag = RTag.GenericApply;
    public readonly tag = RTag.GenericApply;

    public readonly generic: RGeneric<T>;
    public readonly args: ReadonlyArray<RType>;

    public constructor(
        generic: RGeneric<T>,
        args: ReadonlyArray<RType>
    ) {
        this.generic = generic;
        this.args = args;
    }
}
