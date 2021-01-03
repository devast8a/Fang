import { UDeclClass } from './UDeclClass';
import { UDeclFunction } from './UDeclFunction';
import { UDeclParameter } from './UDeclParameter';
import { UDeclTrait } from './UDeclTrait';
import { UDeclVariable } from './UDeclVariable';
import { UExprCall } from './UExprCall';
import { UExprGet } from './UExprGet';

export type UNode =
    | UDeclClass
    | UDeclFunction
    | UDeclParameter
    | UDeclTrait
    | UDeclVariable
    | UExprCall
    | UExprGet
    ;
