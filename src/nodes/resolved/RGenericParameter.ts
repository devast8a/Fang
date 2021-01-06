import { RGeneric } from './RGeneric';
import { RTag } from './RTag';


export class RGenericParameter<T> {
    public static readonly tag = RTag.GenericParameter;
    public readonly tag = RTag.GenericParameter;

    //TODO: Set both of these correctly
    public readonly index!: number;
    public readonly generic!: RGeneric<T>;
}
