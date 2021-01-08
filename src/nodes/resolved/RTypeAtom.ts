import { RTag } from './RTag';
import { RType } from './RType';

export class RTypeAtom {
    public static readonly tag = RTag.TypeAtom;
    public readonly tag = RTag.TypeAtom;

    public value: string;
    public type: RType;

    public constructor(
        value: string,
        type: RType,
    ) {
        this.value = value;
        this.type = type;
    }
}