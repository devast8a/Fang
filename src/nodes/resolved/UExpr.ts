import { UExprAssign } from './UAssign';
import { UExprAtom } from './UAtom';
import { UExprCall } from './UCall';
import { UExprField } from './UField';

export type UExpr =
    | UExprAssign
    | UExprAtom
    | UExprCall
    | UExprField;
