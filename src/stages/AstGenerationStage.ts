/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { builtin } from '../Builtin';
import { Source } from '../common/source';
import { Compiler, ParseContext, ParseStage } from '../compile';
import * as Nodes from '../nodes';
import { Node, UnresolvedId } from '../nodes';
import { PNode, PTag } from '../parser/post_processor';

const InferType = new Nodes.TypeInfer();
const Placeholder = {} as Node;

interface Context {
    compiler: Compiler;
    module: Nodes.DeclModule;
    parent: number;
    source: Source;
}

export class AstGenerationStage implements ParseStage {
    public name = "Ast Generation";

    public execute(compiler: Compiler, nodes: any, context: ParseContext): Node[] {
        // TODO: node is PNode, violating the interface

        const output = [];

        for (const node of nodes) {
            output.push(parseStmt(node, {
                compiler: compiler,
                module: context.module,
                parent: 0,
                source: context.source,
            }));
        }

        return output;
    }
}

function parseStmtArray(node: PNode, context: Context) {
    return node.elements.map(node => parseStmt(node, context));
}

function parseStmt(node: PNode, context: Context): Node {
    const module = context.module;

    switch (node.tag) {
        case PTag.DeclClass: {
            const parent = context.parent;
            const id = module.nodes.length;
            module.nodes.push(Placeholder);
            context.parent = id;

            // keyword
            const name = parseIdentifier(node.data[1]);
            const superTypes = node.data[2] === null ? [] : node.data[2].map(x => parseType(x[3]));
            // generic
            // attributes
            const body = parseStmtArray(node.data[5][1], context);

            // Generate member mapping
            const members = new Map(body.map(member => [
                (member as Nodes.DeclFunction).name,
                member
            ]));

            context.parent = parent;
            const result = new Nodes.DeclStruct(parent, id, name, members, new Set(superTypes));
            module.nodes[id] = result;
            return result;
        }

        case PTag.DeclFunction: {
            const parent = context.parent;
            const id = module.nodes.length;
            module.nodes.push(Placeholder);
            context.parent = id;

            // keyword
            const name = parseIdentifier(node.data[1][1]);
            // compileTime
            const parameters = node.data[3].elements.map(variable => parseVariable(variable, context));
            const returnType = node.data[4] === null ? InferType : parseType(node.data[4][3]);
            // generic
            // attributes
            const body = (node.data[7].length === 2) ?
                parseStmtArray(node.data[7][1], context) :
                [new Nodes.ExprReturn(parseExpr(node.data[7][4]))];

            context.parent = parent;
            const result = new Nodes.DeclFunction(parent, id, name, parameters, returnType, body, Nodes.FunctionFlags.None);
            module.nodes[id] = result;
            return result;
        }

        case PTag.DeclTrait: {
            const parent = context.parent;
            const id = module.nodes.length;
            module.nodes.push(Placeholder);
            context.parent = id;

            // keyword
            const name = parseIdentifier(node.data[1]);
            const superTypes = node.data[2] === null ? [] : node.data[2].map(x => parseType(x[3]));
            // generic
            // attributes
            const body = parseStmtArray(node.data[5][1], context);

            context.parent = parent;
            const result = new Nodes.DeclTrait(parent, id, name, body, new Set(superTypes));
            module.nodes[id] = result;
            return result;
        }

        case PTag.DeclVariable: {
            return parseVariable(node, context);
        }

        case PTag.StmtIf: {
            // TODO: Finish implementing if
            // keyword
            const condition = parseExpr(node.data[1][2]);
            const body      = parseStmtArray(node.data[2], context);
            // branches
            const elseBranch = node.data[4] === null ?
                [] :
                parseStmtArray(node.data[4][1], context);

            const firstBranch = new Nodes.ExprIfBranch(condition, body);
            
            return new Nodes.ExprIf([firstBranch], elseBranch);
        }

        case PTag.StmtWhile: {
            // keyword
            // compileTime
            const condition = parseExpr(node.data[2][3]);
            const body      = parseStmtArray(node.data[3], context);

            return new Nodes.ExprWhile(condition, body);
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
                    return new Nodes.ExprCall(new Nodes.ExprRefName("+"), []);
                }

                case 3: {
                    return new Nodes.ExprCall(new Nodes.ExprRefName("+"), []);
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

function parseVariable(node: PNode, context: Context): Nodes.DeclVariable {
    const flags = convertVariableKeyword(node.data[0]?.[0]?.value);
    const name  = parseIdentifier(node.data[1]);
    // compileTime
    const type  = node.data[3] === null ? InferType : parseType(node.data[3][3]);
    // attributes
    const value = node.data[5] === null ? null  : parseExpr(node.data[5][3]);

    // TODO: Set variable id here - rather than in name resolution
    return new Nodes.DeclVariable(context.parent, UnresolvedId, name, type, value, flags);
}

function parseIdentifier(node: PNode) {
    return node.value;
}