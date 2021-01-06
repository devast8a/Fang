import { RExprCallField } from './RExprCallfield';
import { RExprCallStatic } from './RExprCallStatic';
import { RExprConstant } from './RExprConstant';
import { RExprConstruct } from './RExprConstruct';
import { RExprGetField } from './RExprGetField';
import { RExprSetField } from './RExprSetField';
import { RExprSetLocal } from './RExprSetLocal';

/*
    tag: RTag;
    resultType: RType
*/
export type RExpr =
    | RExprCallField
    | RExprCallStatic
    | RExprConstant
    | RExprConstruct
    | RExprGetField
    | RExprSetField
    | RExprSetLocal
    ;

