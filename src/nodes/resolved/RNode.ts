import { RDeclClass } from './RDeclClass';
import { RGenericParameter } from "./RGenericParameter";
import { RGenericApply } from "./RGenericApply";
import { RGeneric } from "./RGeneric";
import { RDeclFunction } from './RDeclFunction';
import { RDeclTrait } from './RDeclTrait';
import { RExprCallField } from './RExprCallfield';
import { RExprCallStatic } from './RExprCallStatic';
import { RExprConstant } from './RExprConstant';
import { RExprConstruct } from './RExprConstruct';
import { RExprGetField } from './RExprGetField';
import { RExprGetLocal } from './RExprGetLocal';
import { RExprSetField } from './RExprSetField';
import { RExprSetLocal } from './RExprSetLocal';
import { RStmtReturn } from './RStmtReturn';
import { RDeclVariable } from './RDeclVariable';
import { RTypeAtom } from './RTypeAtom';
import { UExprAssign } from './UAssign';
import { UExprAtom } from './UAtom';
import { UExprCall } from './UCall';
import { UExprField } from './UField';
import { RStmtIf } from './RStmtIf';
import { RStmtWhile } from './RStmtWhile';
import { RStmtIfCase } from './RStmtIfCase';

export type RNode =
    | RDeclClass
    | RDeclFunction
    | RDeclTrait
    | RDeclVariable
    | RExprCallField
    | RExprCallStatic
    | RExprConstant
    | RExprConstruct
    | RExprGetField
    | RExprGetLocal
    | RExprSetField
    | RExprSetLocal
    | RGeneric<RNode>
    | RGenericApply<RNode>
    | RGenericParameter<RNode>
    | RStmtIf
    | RStmtIfCase
    | RStmtReturn
    | RStmtWhile
    | RTypeAtom
    | UExprAssign
    | UExprAtom
    | UExprCall
    | UExprField
    ;

export namespace RNodes {
    export const DeclClass          = RDeclClass;
    export const DeclFunction       = RDeclFunction;
    export const DeclTrait          = RDeclTrait;
    export const DeclVariable       = RDeclVariable;
    export const ExprCallField      = RExprCallField;
    export const ExprCallStatic     = RExprCallStatic;
    export const ExprConstant       = RExprConstant;
    export const ExprConstruct      = RExprConstruct;
    export const ExprGetField       = RExprGetField;
    export const ExprGetLocal       = RExprGetLocal;
    export const ExprSetField       = RExprSetField;
    export const ExprSetLocal       = RExprSetLocal;
    export const Generic            = RGeneric;
    export const GenericApply       = RGenericApply;
    export const GenericParameter   = RGenericParameter;
    export const StmtIf             = RStmtIf;
    export const StmtIfCase         = RStmtIfCase;
    export const StmtReturn         = RStmtReturn;
    export const StmtWhile          = RStmtWhile;
    export const TypeAtom           = RTypeAtom;
    export const UUExprAssign       = UExprAssign;
    export const UUExprAtom         = UExprAtom;
    export const UUExprCall         = UExprCall;
    export const UUExprField        = UExprField;

    export type DeclClass           = RDeclClass;
    export type DeclFunction        = RDeclFunction;
    export type DeclTrait           = RDeclTrait;
    export type DeclVariable        = RDeclVariable;
    export type ExprCallField       = RExprCallField;
    export type ExprCallStatic      = RExprCallStatic;
    export type ExprConstant        = RExprConstant;
    export type ExprConstruct       = RExprConstruct;
    export type ExprGetField        = RExprGetField;
    export type ExprGetLocal        = RExprGetLocal;
    export type ExprSetField        = RExprSetField;
    export type ExprSetLocal        = RExprSetLocal;
    export type Generic<T>          = RGeneric<T>;
    export type GenericApply<T>     = RGenericApply<T>;
    export type GenericParameter<T> = RGenericParameter<T>;
    export type StmtIf              = RStmtIf;
    export type StmtIfCase          = RStmtIfCase;
    export type StmtReturn          = RStmtReturn;
    export type StmtWhile           = RStmtWhile;
    export type TypeAtom            = RTypeAtom;
    export type UUExprAssign        = UExprAssign;
    export type UUExprAtom          = UExprAtom;
    export type UUExprCall          = UExprCall;
    export type UUExprField         = UExprField;
}