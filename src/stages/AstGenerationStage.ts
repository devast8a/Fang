/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Source } from '../common/source';
import { Compiler } from '../compile';
import { RExpr } from '../nodes/resolved/RExpr';
import { RNode, RNodes } from '../nodes/resolved/RNode';
import { RType } from '../nodes/resolved/RType';
import { VariableFlags } from '../nodes/VariableFlags';
import { Parser } from '../parser/parser';
import { PTag } from '../parser/post_processor';

export class AstGenerationStage {
    public execute(compiler: Compiler, parseNodes: any[], source: Source) {
        const nodes = [];

        for (const parseNode of parseNodes) {
            const node = Main.parse(parseNode);

            if (node === null) {
                throw new Error("Broken Assertion: Output of Parser.parse shouldn't be null if the input isn't null");
            }

            nodes.push(node);
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
const Expr = new Parser<RExpr>("Expr");
const Type = new Parser<RType>("TypeExpr");

////////////////////////////////////////////////////////////////////////////////////////////////////
Main.register(PTag.DeclClass, (node, parser) => {
    const name       = node[1]!.value;
    const superTypes = node[2]!.map((node) => Type.parse(node![3]!));
    const body       = node[5] !== null ? node[5]![1]!.map((node: any) => parser.parse(node)) : [];

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
    const body       = node[5] !== null ? node[5]![1]!.map((node: any) => parser.parse(node)) : [];

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
        value,
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
        value
    );
});

Main.register(PTag.ExprMacroCall, (node) => {
    const target     = node[0]!.value;
    const argument   = Expr.parse(node[2]![1]!);

    return new RNodes.ExprCallField(undefined as any, undefined as any, []);
});

Main.register(PTag.ExprCall, (node) => {
    const target      = Expr.parse(node[0]!);
    const compileTime = node[1] !== null;
    const args        = node[2]!.elements.map((node) => Expr.parse(node!));

    return new RNodes.ExprCallStatic(undefined as any, args);
});

Main.register(PTag.StmtAssign, (node) => {
    const target     = Expr.parse(node[0]!);
    const operator   = Expr.parse(node[1]!);
    const source     = Expr.parse(node[2]!);

    return new RNodes.ExprSetLocal(undefined as any, source);
});

Expr.register(PTag.ExprIdentifier, (node) => {
    const name = node[0]!.value;

    return new RNodes.ExprGetLocal(undefined as any);
});

Expr.register(PTag.ExprCall, Main.builders[PTag.ExprCall] as any);

Type.register(PTag.ExprIdentifier, (node) => {
    const name = node[0]!.value;

    return new RNodes.TypeAtom(name, null);
});

Expr.register(PTag.LiteralString, (node) => {
    const value = node[0]!.value.slice(1, -1);

    return new RNodes.Constant(
        value.slice(1, -1),
        undefined as any    // TODO: Set to string
    );
});