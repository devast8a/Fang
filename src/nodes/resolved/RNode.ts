import { RDeclClass } from './RDeclClass';
import { RGenericParameter } from "./RGenericParameter";
import { RGenericApply } from "./RGenericApply";
import { RGeneric } from "./RGeneric";
import { Thing } from '../../ast/things';
import { RDeclParameter } from './RDeclParameter';
import { RDeclFunction } from './RDeclFunction';
import { RDeclTrait } from './RDeclTrait';

export type RNode =
    | RDeclClass
    | RDeclFunction
    | RDeclParameter
    | RDeclTrait
    | RGeneric<RNode>
    | RGenericApply<RNode>
    | RGenericParameter
    | Thing // TODO: Remove backwards compatibility
    ;