import { RDeclClass } from './RDeclClass';
import { RGenericParameter } from "./RGenericParameter";
import { RGenericApply } from "./RGenericApply";
import { RGeneric } from "./RGeneric";
import { RDeclFunction } from './RDeclFunction';
import { RDeclTrait } from './RDeclTrait';
import { RExprCallField } from './RExprCallfield';
import { RExprCallStatic } from './RExprCallStatic';

export type RNode =
    | RDeclClass
    | RDeclFunction
    | RDeclTrait
    | RExprCallField
    | RExprCallStatic
    | RGeneric<RNode>
    | RGenericApply<RNode>
    | RGenericParameter<RNode>
    ;