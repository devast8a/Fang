import { UTag } from './UTag';

export class UTypeAtom {
    public static readonly tag = UTag.TypeAtom;
    public readonly tag = UTag.TypeAtom;

    public value: string;

    public constructor(
        value: string
    ) {
        this.value = value;
    }
}