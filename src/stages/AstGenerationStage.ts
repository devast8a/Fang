/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { builtin } from '../Builtin';
import { Compiler, ParseContext, ParseStage } from '../compile';
import * as Nodes from '../nodes';
import { Node, UnresolvedId } from '../nodes';
import { PNode, PTag } from '../parser/post_processor';

const InferType = new Nodes.TypeInfer();

export class AstGenerationStage implements ParseStage {
    public name = "Ast Generation";

    public execute(compiler: Compiler, nodes: any, context: ParseContext): Node[] {
        // TODO: node is PNode, violating the interface

        const output = [];

        for (const node of nodes) {
            output.push(parseStmt(node!));
        }

        return output;
    }
}

function parseStmt(node: PNode): Node {
    switch (node.tag) {
        case PTag.DeclClass: {
            // keyword
            const name = parseIdentifier(node.data[1]);
            const superTypes = node.data[2] === null ? [] : node.data[2].map(x => parseType(x[3]));
            // generic
            // attributes
            const body = node.data[5][1].elements.map(parseStmt);

            const members = new Map(body.map(member => [
                (member as Nodes.Function).name,
                member
            ]));

            return new Nodes.Class(UnresolvedId, UnresolvedId, name, members, new Set(superTypes));
        }

        case PTag.DeclFunction: {
            // keyword
            const name = parseIdentifier(node.data[1][1]);
            // compileTime
            const parameters = node.data[3].elements.map(parseVariable);
            const returnType = node.data[4] === null ? InferType : parseType(node.data[4][3]);
            // generic
            // attributes
            const body = (node.data[7].length === 2) ?
                node.data[7][1].elements.map(parseStmt) :
                [new Nodes.StmtReturn(parseExpr(node.data[7][4]))];

            return new Nodes.Function(UnresolvedId, UnresolvedId, name, parameters, returnType, body, Nodes.FunctionFlags.None);
        }

        case PTag.DeclTrait: {
            // keyword
            const name = parseIdentifier(node.data[1]);
            const superTypes = node.data[2] === null ? [] : node.data[2].map(x => parseType(x[3]));
            // generic
            // attributes
            const body = node.data[5][1].elements.map(parseStmt);

            return new Nodes.Trait(UnresolvedId, UnresolvedId, name, body, new Set(superTypes));
        }

        case PTag.DeclVariable: {
            return parseVariable(node);
        }

        case PTag.StmtIf: {
            // TODO: Finish implementing if
            // keyword
            const condition = parseExpr(node.data[1][2]);
            const body      = node.data[2].elements.map(parseStmt);
            // branches
            const elseBranch = node.data[4] === null ?
                [] :
                node.data[4][1].elements.map(parseStmt);

            const firstBranch = new Nodes.StmtIfBranch(condition, body);
            
            return new Nodes.StmtIf([firstBranch], elseBranch);
        }

        case PTag.StmtWhile: {
            // keyword
            // compileTime
            const condition = parseExpr(node.data[2][3]);
            const body      = node.data[3].elements.map(parseStmt);

            return new Nodes.StmtWhile(condition, body);
        }

        case PTag.StmtAssign: {
            // Target Operator Value
            const value     = parseExpr(node.data[2]);

            switch (node.data[0].tag) {
                case PTag.ExprIdentifier: return new Nodes.ExprSetLocal(parseIdentifier(node.data[0].data[0]), value);
                case PTag.ExprIndexDot:   return new Nodes.ExprSetField(parseExpr(node.data[0].data[0]), parseIdentifier(node.data[0].data[2]), value);
                default: throw new Error("Unreachable");
            }
        }

        case PTag.ExprMacroCall: {
            const target = parseIdentifier(node.data[0]);
            const expr   = parseExpr(node.data[2][1]);

            return new Nodes.ExprMacroCall(target, [expr]);
        }


        case PTag.ExprCall:
            return parseExpr(node) as any;
    }

    throw new Error(`parseStmt: No case for '${PTag[node.tag]}'`)
}

function parseExpr(node: PNode): Node {
    switch (node.tag) {
        case PTag.LiteralIntegerDec: {
            return new Nodes.ExprConstant({} as any, "");
        }

        case PTag.ExprBinary: {
            switch (node.data.length) {
                case 5: {
                    return new Nodes.ExprCallStatic(new Nodes.ExprRefName("+"), []);
                }

                case 3: {
                    return new Nodes.ExprCallStatic(new Nodes.ExprRefName("+"), []);
                }

                default: throw new Error('Unreachable')
            }
        }

        case PTag.ExprConstruct: {
            const target    = parseType(node.data[0]);
            // compileTime
            const args      = node.data[2].elements.map(parseExpr);

            return new Nodes.ExprConstruct(target, args);
        }

        case PTag.ExprIdentifier: {
            const name = parseIdentifier(node.data[0]);

            switch (name) {
                case "true":  return builtin.true;
                case "false": return builtin.false;
                default:      return new Nodes.ExprRefName(name);
            }
        }

        case PTag.ExprIndexDot: {
            const target = parseExpr(node.data[0]);
            const name   = parseIdentifier(node.data[2]);

            return new Nodes.ExprGetField(target, name);
        }

        case PTag.ExprCall: {
            const target = parseExpr(node.data[0]);
            // compileTime
            const args   = node.data[2].elements.map(parseExpr);

            return new Nodes.ExprCall(target, args);
        }
    }

    throw new Error(`parseExpr: No case for '${PTag[node.tag]}'`)
}

function parseType(node: PNode): Nodes.Type {
    switch (node.tag) {
        case PTag.ExprIdentifier: {
            const name = parseIdentifier(node.data[0]);
            return new Nodes.TypeRefName(name);
        }
    }
    
    throw new Error(`parseType: No case for '${PTag[node.tag]}'`)
}

function convertVariableKeyword(keyword: string | undefined) {
    switch (keyword) {
        case "mut":     return Nodes.VariableFlags.Local | Nodes.VariableFlags.Mutates;
        case "val":     return Nodes.VariableFlags.Local;
        case "own":     return Nodes.VariableFlags.Local | Nodes.VariableFlags.Owns;
        case undefined: return Nodes.VariableFlags.Local;
        default: throw new Error("Unreachable");
    }
}

function parseVariable(node: PNode): Nodes.Variable {
    const flags = convertVariableKeyword(node.data[0]?.[0]?.value);
    const name  = parseIdentifier(node.data[1]);
    // compileTime
    const type  = node.data[3] === null ? InferType : parseType(node.data[3][3]);
    // attributes
    const value = node.data[5] === null ? null  : parseExpr(node.data[5][3]);

    return new Nodes.Variable(UnresolvedId, UnresolvedId, name, type, value, flags);
}

function parseIdentifier(node: PNode) {
    return node.value;
}