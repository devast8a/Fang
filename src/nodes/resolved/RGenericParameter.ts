import { RGeneric } from './RGeneric';
import { RTag } from './RTag';


export class RGenericParameter<T> {
    public static readonly tag = RTag.GenericParameter;
    public readonly tag = RTag.GenericParameter;

    //TODO: Set both of these correctly
    public index!: number;
    public generic!: RGeneric<T>;
}
