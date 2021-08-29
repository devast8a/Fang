/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { builtin } from '../Builtin';
import { Source } from '../common/source';
import { Compiler } from '../compile';
import * as Nodes from '../nodes';
import { Node } from '../nodes';
import { PNode, PTag } from '../parser/post_processor';

const InferType = new Nodes.TypeInfer();
const UnresolvedId = -1;

export class AstGenerationStage {
    public execute(compiler: Compiler, nodes: PNode, source: Source): Node[] {
        const output = [];

        for (const node of nodes) {
            output.push(parseStmt(node!));
        }

        return output;
    }
}

function parseStmt(node: PNode): Nodes.Stmt {
    switch (node.tag) {
        case PTag.DeclClass: {
            // keyword
            const name = parseIdentifier(node.data[1]);
            const superTypes = node.data[2] === null ? [] : node.data[2].map(x => parseType(x[3]));
            // generic
            // attributes
            const body = node.data[5][1].elements.map(parseStmt);

            return new Nodes.Class(name, body, new Set(superTypes));
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

            return new Nodes.Function(name, parameters, returnType, body);
        }

        case PTag.DeclTrait: {
            // keyword
            const name = parseIdentifier(node.data[1]);
            const superTypes = node.data[2] === null ? [] : node.data[2].map(x => parseType(x[3]));
            // generic
            // attributes
            const body = node.data[5][1].elements.map(parseStmt);

            return new Nodes.Trait(name, body, new Set(superTypes));
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
                default: throw new Error("Unreachable");
            }
        }

        case PTag.ExprCall:
            return parseExpr(node) as any;
    }

    throw new Error(`parseStmt: No case for '${PTag[node.tag]}'`)
}

function parseExpr(node: PNode): Nodes.Expr {
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
                default:      return new Nodes.ExprGetLocal(name);
            }
        }

        case PTag.ExprCall: {
            switch (node.data[0].tag) {
                case PTag.ExprIdentifier: {
                    const target    = new Nodes.ExprRefName(parseIdentifier(node.data[0].data[0]));
                    // compileTime
                    const args      = node.data[2].elements.map(parseExpr);

                    return new Nodes.ExprCallStatic(target, args);
                }
                default: throw new Error("Unreachable");
            }
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
        case "mut":     return Nodes.Flags.Local | Nodes.Flags.Mutates;
        case "val":     return Nodes.Flags.Local;
        case "own":     return Nodes.Flags.Local | Nodes.Flags.Owns;
        case undefined: return Nodes.Flags.Local;
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

    return new Nodes.Variable(name, type, value, flags, UnresolvedId);
}

function parseIdentifier(node: PNode) {
    return node.value;
}