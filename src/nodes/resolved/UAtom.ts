import { RTag } from './RTag';

export class UExprAtom {
    public static readonly tag = RTag.UExprAtom;
    public readonly tag = RTag.UExprAtom;

    public name: string;

    public constructor(
        name: string,
    ) {
        this.name = name;
    }
}