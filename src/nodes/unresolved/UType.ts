import { RDeclClass } from '../resolved/RDeclClass';
import { RDeclFunction } from '../resolved/RDeclFunction';
import { RDeclTrait } from '../resolved/RDeclTrait';
import { RDeclVariable } from '../resolved/RDeclVariable';
import { UDeclClass } from './UDeclClass';
import { UDeclFunction } from './UDeclFunction';
import { UDeclTrait } from './UDeclTrait';
import { UTypeAtom } from './UTypeATom';

export type UType =
    | UDeclClass
    | UDeclFunction
    | UDeclTrait
    | UTypeAtom
    ;