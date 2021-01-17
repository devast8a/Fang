import { RTag } from './RTag';
import { RType } from './RType';

export class RTypeAtom {
    public static readonly tag = RTag.TypeAtom;
    public readonly tag = RTag.TypeAtom;

    public name: string;
    public type: RType | null;

    public constructor(
        name: string,
        type: RType | null,
    ) {
        this.name = name;
        this.type = type;
    }
}