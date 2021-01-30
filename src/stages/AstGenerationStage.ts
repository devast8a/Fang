/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { builtin } from '../Builtin';
import { Source } from '../common/source';
import { Compiler } from '../compile';
import { VariableFlags } from '../nodes/resolved/RDeclVariable';
import { RNode, RNodes } from '../nodes/resolved/RNode';
import { RStmtIfCase } from "../nodes/resolved/RStmtIfCase";
import { RType } from '../nodes/resolved/RType';
import { UExpr } from '../nodes/resolved/UExpr';
import { Parser } from '../parser/parser';
import { PTag } from '../parser/post_processor';

export class AstGenerationStage {
    public execute(compiler: Compiler, parseNodes: any[], source: Source) {
        const nodes = [];

        for (const parseNode of parseNodes) {
            nodes.push(Main.parse(parseNode));
        }

        return nodes;
    }
}

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

const Main = new Parser<RNode>("Main");
const Expr = new Parser<UExpr>("Expr");
const Type = new Parser<RType>("TypeExpr");

////////////////////////////////////////////////////////////////////////////////////////////////////
Main.register(PTag.DeclClass, (node, parser) => {
    const name       = node[1]!.value;
    const superTypes = node[2]!.map((node) => Type.parse(node![3]!));
    const body       = node[5] !== null ? node[5]![1]!.elements.map((node: any) => parser.parse(node)) : [];

    return new RNodes.DeclClass(name, superTypes, body);
});

Main.register(PTag.DeclFunction, (node, parser) => {
    const name        = node[1]![1]!.value;
    const compileTime = node[2] !== null;
    const parameters  = node[3]!.elements.map((node) => parser.parse(node!));
    const returnType  = Type.parse(node[4]?.[3]);
    const body        = node[7] !== null ? node[7][1]!.elements.map((node) => parser.parse(node!)) : [];

    return new RNodes.DeclFunction(
        name,
        returnType!, // TODO: Support return type inference
        parameters as Array<RNodes.DeclVariable>,
        compileTime,
        body
    );
});

Main.register(PTag.DeclTrait, (node, parser) => {
    const name       = node[1]!.value;
    const superTypes = node[2]!.map((node: any) => Type.parse(node[3]));
    const body       = node[5] !== null ? node[5]![1]!.elements.map((node: any) => parser.parse(node)) : [];

    return new RNodes.DeclTrait(
        name,
        superTypes,
        body
    );
});

Main.register(PTag.DeclParameter, (node) => {
    // The backend of the compiler doesn't distinguish between parameters and variables.
    const flags       = parameterToFlags(node[0]?.[0]?.value) | VariableFlags.Local;
    const name        = node[1]!.value;
    const compileTime = node[2] !== null;
    const type        = Type.parse(node[3]?.[3]);
    const value       = Expr.parse(node[4]?.[3]);

    return new RNodes.DeclVariable(
        name,
        type!,
        flags,
        compileTime,
        value as any,
    );
});

Main.register(PTag.DeclVariable, (node) => {
    const flags       = parameterToFlags(node[0]?.[0]?.value) | VariableFlags.Local;
    const name        = node[1]!.value;
    const compileTime = node[2] !== null;
    const type        = Type.parse(node[3]?.[3]);
    const value       = Expr.parse(node[4]?.[3]);

    return new RNodes.DeclVariable(
        name,
        type!,
        flags,
        compileTime,
        value as any
    );
});

Main.register(PTag.ExprMacroCall, (node) => {
    const target     = Expr.parse(node[0]!);
    const argument   = Expr.parse(node[2]![1]!);

    return new RNodes.UUExprCall(target, [argument], true);
});

Main.register(PTag.ExprCall, (node) => {
    const target      = Expr.parse(node[0]!);
    const compileTime = node[1] !== null;
    const args        = node[2]!.elements.map((node) => Expr.parse(node!));

    return new RNodes.UUExprCall(target, args, compileTime);
});

Main.register(PTag.StmtAssign, (node) => {
    const target     = Expr.parse(node[0]!);
    // TODO: Include operator
    const source     = Expr.parse(node[2]!);

    return new RNodes.UUExprAssign(target, source);
});

Main.register(PTag.StmtIf, (node) => {
    // StmtIf -> SiKeyword SiCondition SiBody SiElif:* SiElse:? {%p.StmtIf%}
    const condition = Expr.parse(node[1]![2]!);
    const body      = node[2]!.elements.map((node) => Main.parse(node!));
    const elseBody  = node[4]?.[1]?.elements.map((node) => Main.parse(node!)) ?? [];

    return new RNodes.StmtIf([
        new RStmtIfCase(condition as any, body) as any,
    ], elseBody);
});

////////////////////////////////////////////////////////////////////////////////////////////////////
Expr.register(PTag.ExprBinary, (node, parser) => {
    // ExprBinary -> ExprUnary __ OperatorSpaced __ ExprBinary    {%p.ExprBinary%}
    // ExprBinary -> ExprUnary NL OperatorSpaced __ ExprBinary    {%p.ExprBinary%}
    // ExprBinary -> ExprUnary __ OperatorSpaced NL ExprBinary    {%p.ExprBinary%}
    // ExprBinary -> Atom Operator Atom                           {%p.ExprBinary%}

    switch (node.length) {
        case 5: {
            const left = parser.parse(node[0]!);
            // TODO: Include operator
            const right = parser.parse(node[4]!);

            return new RNodes.UUExprCall(new RNodes.UUExprAtom("lessThan"), [left, right]);
        }

        case 3: {
            const left = parser.parse(node[0]!);
            // TODO: Include operator
            const right = parser.parse(node[2]!);

            return new RNodes.UUExprCall(new RNodes.UUExprAtom("lessThan"), [left, right]);
        }

        default: {
            throw new Error("Expr.register - Unexpected number of nodes passed in as argument");
        }
    }
});

Expr.register(PTag.ExprCall, Main.builders[PTag.ExprCall] as any);

Expr.register(PTag.ExprIdentifier, (node) => {
    const name = node[0]!.value;

    return new RNodes.UUExprAtom(name) as any;
});

Expr.register(PTag.LiteralString, (node) => {
    const value = node[0]!.value.slice(1, -1);

    return new RNodes.ExprConstant(
        new RNodes.TypeAtom("str", builtin.types.str),
        value,
    ) as any;
});

Expr.register(PTag.LiteralIntegerDec, (node) => {
    const value = node[0]!.value.replace(/_/g, '');

    return new RNodes.ExprConstant(
        new RNodes.TypeAtom("s32", builtin.types.s32),
        value,
    ) as any;
});

////////////////////////////////////////////////////////////////////////////////////////////////////
Type.register(PTag.ExprIdentifier, (node) => {
    const name = node[0]!.value;

    return new RNodes.TypeAtom(name, null);
});