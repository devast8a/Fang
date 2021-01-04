import { RNode } from './RNode';
import { RTag } from './RTag';
import { RGenericParameter } from "./RGenericParameter";


export class RGeneric<T extends RNode> {
    public static readonly tag = RTag.Generic;
    public readonly tag = RTag.Generic;

    public readonly target: T;
    public readonly parameters: ReadonlyArray<RGenericParameter>;

    public constructor(
        target: T
    ) {
        this.target = target;
        this.parameters = []; // TODO: Support parameters properly
    }
}
