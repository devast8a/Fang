import { RNodes } from './RNode';

/*
    tag: RTag;
    resultType: RType
*/
export type RExpr =
    | RNodes.ExprCallField
    | RNodes.ExprCallStatic
    | RNodes.ExprConstant
    | RNodes.ExprConstruct
    | RNodes.ExprGetField
    | RNodes.ExprGetLocal
    | RNodes.ExprSetField
    | RNodes.ExprSetLocal
    ;