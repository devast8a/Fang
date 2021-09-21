/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { builtin } from '../Builtin';
import { Source } from '../common/source';
import { Compiler, ParseContext, ParseStage } from '../compile';
import * as Nodes from '../nodes';
import { Decl, Expr, Node, UnresolvedId } from '../nodes';
import { PNode, PTag } from '../parser/post_processor';

const InferType = new Nodes.TypeInfer();
const Placeholder = {} as Decl;

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
            output.push(parseExpr({
                compiler: compiler,
                module: context.module,
                parent: 0,
                source: context.source,
            }, node));
        }

        return output;
    }
}

function parseStmtArray(node: PNode, context: Context) {
    return node.elements.map(node => parseExpr(context, node));
}

function parseExpr(context: Context, node: PNode): Expr {
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
            // const members = new Map(body.map(member => [
            //     (member as Nodes.DeclFunction).name,
            //     member
            // ]));

            context.parent = parent;
            const result = new Nodes.DeclStruct(parent, id, name, new Map(), new Set(superTypes));
            module.nodes[id] = result;
            return new Nodes.ExprDeclaration(result.id);
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
                [new Nodes.ExprReturn(parseExpr(context, node.data[7][4]))];

            context.parent = parent;
            const result = new Nodes.DeclFunction(parent, id, name, parameters, returnType, body as any, Nodes.FunctionFlags.None);
            module.nodes[id] = result;
            return new Nodes.ExprDeclaration(result.id);
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
            const result = new Nodes.DeclTrait(parent, id, name, body as any, new Set(superTypes));
            module.nodes[id] = result;
            return new Nodes.ExprDeclaration(result.id);
        }

        case PTag.DeclVariable: {
            const variable = parseVariable(node, context)
            return new Nodes.ExprDeclaration(variable.id);
        }

        case PTag.StmtIf: {
            // TODO: Finish implementing if
            // keyword
            const condition = parseExpr(context, node.data[1][2]);
            const body      = parseStmtArray(node.data[2], context);
            // branches
            const elseBranch = node.data[4] === null ?
                [] :
                parseStmtArray(node.data[4][1], context);

            // TODO: Resolve
            const firstBranch = new Nodes.ExprIfBranch(condition, body as any);
            
            return new Nodes.ExprIf([firstBranch], elseBranch as any);
        }

        case PTag.StmtWhile: {
            // keyword
            // compileTime
            const condition = parseExpr(context, node.data[2][3]);
            const body      = parseStmtArray(node.data[3], context);

            return new Nodes.ExprWhile(condition, body as any);
        }

        case PTag.StmtAssign: {
            // Target Operator Value
            const value     = parseExpr(context, node.data[2]);

            switch (node.data[0].tag) {
                case PTag.ExprIdentifier: return new Nodes.ExprSetLocal(parseIdentifier(node.data[0].data[0]), value);
                case PTag.ExprIndexDot:   return new Nodes.ExprSetField(parseExpr(context, node.data[0].data[0]), parseIdentifier(node.data[0].data[2]), value);
                default: throw new Error("Unreachable");
            }
        }

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
            const args      = node.data[2].elements.map((expr) => parseExpr(context, expr));

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
            const target = parseExpr(context, node.data[0]);
            const name   = parseIdentifier(node.data[2]);

            return new Nodes.ExprGetField(target, name);
        }

        case PTag.ExprCall: {
            const target = parseExpr(context, node.data[0]);
            // compileTime
            const args   = node.data[2].elements.map((expr) => parseExpr(context, expr));

            return new Nodes.ExprCall(target, args);
        }

        case PTag.ExprMacroCall: {
            const target = parseIdentifier(node.data[0]);
            const expr   = parseExpr(context, node.data[2][1]);

            return new Nodes.ExprMacroCall(target, [expr]);
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
    const value = node.data[5] === null ? null  : parseExpr(context, node.data[5][3]);

    // TODO: Set variable id here - rather than in name resolution
    return new Nodes.DeclVariable(context.parent, UnresolvedId, name, type, value, flags);
}

function parseIdentifier(node: PNode) {
    return node.value;
}