import { RDeclClass } from './RDeclClass';
import { RGenericParameter } from "./RGenericParameter";
import { RGenericApply } from "./RGenericApply";
import { RGeneric } from "./RGeneric";
import { Thing } from '../../ast/things';

export type RNode =
    | RDeclClass
    | RGeneric<RNode>
    | RGenericApply<RNode>
    | RGenericParameter
    | Thing // TODO: Remove backwards compatibility
    ;
