import { RTag } from './RTag';
import { RGenericParameter } from "./RGenericParameter";

export class RGeneric<T> {
    public static readonly tag = RTag.Generic;
    public readonly tag = RTag.Generic;

    public target: T;
    public parameters: Array<RGenericParameter<T>>;

    public constructor(
        target: T
    ) {
        this.target = target;
        this.parameters = []; // TODO: Support parameters properly
    }
}