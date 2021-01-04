import { VariableFlags } from '../ast/things';
import { UNode } from '../nodes/unresolved/UNode';
import { Parser } from './parser';
import { PTag } from './post_processor';
import { UDeclClass } from '../nodes/unresolved/UDeclClass';
import { UDeclTrait } from '../nodes/unresolved/UDeclTrait';
import { UDeclFunction } from '../nodes/unresolved/UDeclFunction';
import { UDeclVariable } from '../nodes/unresolved/UDeclVariable';
import { UExprCall } from '../nodes/unresolved/UExprCall';
import { UDeclParameter } from '../nodes/unresolved/UDeclParameter';
import { UExprGet } from '../nodes/unresolved/UExprGet';

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

////////////////////////////////////////////////////////////////////////////////////////////////////
Main.register(PTag.DeclClass, (node, parser) => {
    const name       = node[1].value;
    const superTypes = node[2].map((node: any) => TypeExpr.parse(node[3]));
    // TODO: Generics
    // TODO: Attributes
    const body       = node[5] !== null ? node[5][1].map((node: any) => parser.parse(node)) : [];

    return new UDeclClass(name, superTypes, body);
});

Main.register(PTag.DeclFunction, (node, parser) => {
    const name        = node[1].value;
    const compileTime = node[2] !== null;
    const parameters  = node[3].elements.map((node: any) => parser.parse(node));
    const returnType  = TypeExpr.parse(node[4]?.[3]);
    const body        = node[7]?.[1].elements.map((node: any) => parser.parse(node));

    return new UDeclFunction(name, compileTime, parameters, returnType as any, body);
});

Main.register(PTag.DeclParameter, (node) => {
    const flags       = parameterToFlags(node[0]?.[0]?.value);
    const name        = node[1].value;
    const compileTime = node[2] !== null;
    const type        = TypeExpr.parse(node[3]?.[3]);
    // TODO: Attributes
    const value       = Expr.parse(node[4]?.[3]);

    return new UDeclParameter(flags, name, compileTime, type as any, value);
});

Main.register(PTag.DeclTrait, (node, parser) => {
    const name       = node[1].value;
    const superTypes = node[2].map((node: any) => TypeExpr.parse(node[3]));
    // TODO: Generics
    // TODO: Attributes
    const body       = node[5] !== null ? node[5][1].map((node: any) => parser.parse(node)) : [];

    return new UDeclTrait(name, superTypes, body);
});

Main.register(PTag.DeclVariable, (node) => {
    const flags       = parameterToFlags(node[0]?.[0]?.value) | VariableFlags.Local;
    const name        = node[1].value;
    const compileTime = node[2] !== null;
    const type        = TypeExpr.parse(node[3]?.[3]);
    // TODO: Attributes
    const value       = Expr.parse(node[4]?.[3]);

    return new UDeclVariable(flags, name, compileTime, type as any, value);
});

Main.register(PTag.ExprCall, (node) => {
    const target      = Expr.parse(node[0]);
    const compileTime = node[1] !== null;
    const args        = node[2].elements.map((x: any) => Expr.parse(x));

    return new UExprCall(target as any, args);
});

export const Expr = new Parser<UNode>("Expr");
Expr.register(PTag.ExprIdentifier, (node) => {
    const name = node[0].value;

    return new UExprGet(name);
});

Expr.register(PTag.ExprCall, Main.builders[PTag.ExprCall]);

export const TypeExpr = new Parser<string>("TypeExpr");
TypeExpr.register(PTag.ExprIdentifier, (node) => {
    const name = node[0].value;

    return name;
});