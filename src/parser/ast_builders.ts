/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { UNode } from '../nodes/unresolved/UNode';
import { Parser } from './parser';
import { PTag } from './post_processor';
import { UDeclClass } from '../nodes/unresolved/UDeclClass';
import { UDeclTrait } from '../nodes/unresolved/UDeclTrait';
import { UDeclFunction } from '../nodes/unresolved/UDeclFunction';
import { UDeclVariable } from '../nodes/unresolved/UDeclVariable';
import { UExprCall } from '../nodes/unresolved/UExprCall';
import { UExprGet } from '../nodes/unresolved/UExprGet';
import { VariableFlags } from '../nodes/VariableFlags';
import { UExprMacroCall } from '../nodes/unresolved/UExprMacroCall';
import { ULiteralString } from '../nodes/unresolved/ULiteralString';
import { UTypeAtom } from '../nodes/unresolved/UTypeATom';
import { UType } from '../nodes/unresolved/UType';

function parameterToFlags(keyword: string | null | undefined) {
    switch (keyword) {
        case undefined: return VariableFlags.None;
        case null:  return VariableFlags.None;
        case "val": return VariableFlags.None;
        case "own": return VariableFlags.Owns;
        case "mut": return VariableFlags.Mutates;
        default: throw new Error(`Unknown parameter keyword ${keyword}`)
    }
}

export const Main = new Parser<UNode>("Main");
export const Expr = new Parser<UNode>("Expr");
export const TypeExpr = new Parser<UType>("TypeExpr");

////////////////////////////////////////////////////////////////////////////////////////////////////
Main.register(PTag.DeclClass, (node, parser) => {
    const name       = node[1]!.value;
    const superTypes = node[2]!.map((node) => TypeExpr.parse(node![3]!));
    // TODO: Generics
    // TODO: Attributes
    const body       = node[5] !== null ? node[5]![1]!.map((node: any) => parser.parse(node)) : [];

    return new UDeclClass(name, superTypes, body);
});

Main.register(PTag.DeclFunction, (node, parser) => {
    const name        = node[1]![1]!.value;
    const compileTime = node[2] !== null;
    const parameters  = node[3]!.elements.map((node) => parser.parse(node!)) as Array<UDeclVariable>;
    const returnType  = TypeExpr.parse(node[4]?.[3]);
    const body        = node[7] !== null ? node[7][1]!.elements.map((node) => parser.parse(node!)) : [];

    return new UDeclFunction(name, compileTime, parameters, returnType, body);
});

Main.register(PTag.DeclTrait, (node, parser) => {
    const name       = node[1]!.value;
    const superTypes = node[2]!.map((node: any) => TypeExpr.parse(node[3]));
    // TODO: Generics
    // TODO: Attributes
    const body       = node[5] !== null ? node[5]![1]!.map((node: any) => parser.parse(node)) : [];

    return new UDeclTrait(name, superTypes, body);
});

Main.register(PTag.DeclParameter, (node) => {
    // The backend of the compiler doesn't distinguish between parameters and variables.
    const flags       = parameterToFlags(node[0]?.[0]?.value) | VariableFlags.Local;
    const name        = node[1]!.value;
    const compileTime = node[2] !== null;
    const type        = TypeExpr.parse(node[3]?.[3]);
    // TODO: Attributes
    const value       = Expr.parse(node[4]?.[3]);

    return new UDeclVariable(flags, name, compileTime, type, value);
});

Main.register(PTag.DeclVariable, (node) => {
    const flags       = parameterToFlags(node[0]?.[0]?.value) | VariableFlags.Local;
    const name        = node[1]!.value;
    const compileTime = node[2] !== null;
    const type        = TypeExpr.parse(node[3]?.[3]);
    // TODO: Attributes
    const value       = Expr.parse(node[4]?.[3]);

    return new UDeclVariable(flags, name, compileTime, type, value);
});

Main.register(PTag.ExprMacroCall, (node) => {
    const target     = node[0]!.value;
    const argument   = Expr.parse(node[2]![1]!);

    return new UExprMacroCall(target, argument);
});

Main.register(PTag.ExprCall, (node) => {
    const target      = Expr.parse(node[0]!);
    const compileTime = node[1] !== null;
    const args        = node[2]!.elements.map((node) => Expr.parse(node!));

    return new UExprCall(target, args);
});

Main.register(PTag.StmtAssign, (node) => {
    const target     = Expr.parse(node[0]!);
    const operator   = Expr.parse(node[1]!);
    const source     = Expr.parse(node[2]!);

    return new UExprCall(null as any, null as any);
});

Expr.register(PTag.ExprIdentifier, (node) => {
    const name = node[0]!.value;

    return new UExprGet(name);
});

Expr.register(PTag.ExprCall, Main.builders[PTag.ExprCall]);

TypeExpr.register(PTag.ExprIdentifier, (node) => {
    const name = node[0]!.value;

    return new UTypeAtom(name);
});

Expr.register(PTag.LiteralString, (node) => {
    const value = node[0]!.value.slice(1, -1);

    return new ULiteralString(value);
});