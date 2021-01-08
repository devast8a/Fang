import { UTag } from './UTag';

export class ULiteralString {
    public static readonly tag = UTag.LiteralString;
    public readonly tag = UTag.LiteralString;

    public value: string;

    public constructor(
        value: string
    ) {
        this.value = value;
    }
}