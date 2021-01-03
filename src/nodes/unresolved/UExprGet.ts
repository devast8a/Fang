import { UTag } from './UTag';

export class UExprGet {
    public static readonly tag = UTag.ExprGet;
    public readonly tag = UTag.ExprGet;

    public readonly name: string;

    public constructor(
        name: string
    ) {
        this.name = name;
    }
}
