import { UDeclClass } from './UDeclClass';
import { UDeclFunction } from './UDeclFunction';
import { UDeclTrait } from './UDeclTrait';
import { UDeclVariable } from './UDeclVariable';
import { UExprCall } from './UExprCall';
import { UExprGet } from './UExprGet';
import { UExprMacroCall } from './UExprMacroCall';
import { ULiteralString } from './ULiteralString';
import { UTypeAtom } from './UTypeATom';

export type UNode =
    | UDeclClass
    | UDeclFunction
    | UDeclTrait
    | UDeclVariable
    | UExprCall
    | UExprGet
    | UExprMacroCall
    | ULiteralString
    | UTypeAtom
    ;

export namespace UNodes {
    export const DeclClass = UDeclClass;
    export const DeclFunction = UDeclFunction;
    export const DeclTrait = UDeclTrait;
    export const DeclVariable = UDeclVariable;
    export const ExprCall = UExprCall;
    export const ExprGet = UExprGet;
    export const ExprMacroCall = UExprMacroCall;
    export const LiteralString = ULiteralString;
    export const TypeAtom = UTypeAtom;

    export type DeclClass = UDeclClass;
    export type DeclFunction = UDeclFunction;
    export type DeclTrait = UDeclTrait;
    export type DeclVariable = UDeclVariable;
    export type ExprCall = UExprCall;
    export type ExprGet = UExprGet;
    export type ExprMacroCall = UExprMacroCall;
    export type LiteralString = ULiteralString;
    export type TypeAtom = UTypeAtom;
}