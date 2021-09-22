/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { ParseContext, ParseStage } from '../compile';
import * as Nodes from '../nodes';
import { Context, Decl, Expr, Node, Tag, UnresolvedId } from '../nodes';
import { PNode, PTag } from '../parser/post_processor';

const InferType   = new Nodes.TypeInfer();
const Placeholder = {} as Decl;

export class AstGenerationStage implements ParseStage {
    public name = "Ast Generation";

    public execute(nodes: any, {context}: ParseContext): Node[] {
        // TODO: node is PNode, violating the interface

        const output = [];

        for (const node of nodes) {
            output.push(parse(context, node));
        }

        return output;
    }
}

function parseList(context: Context, node: PNode) {
    return node.elements.map(node => parse(context, node));
}

function parse(context: Context, node: PNode): Expr {
    const module = context.module;

    switch (node.tag) {
        case PTag.DeclClass: {
            // Setup id
            const id = module.nodes.length;
            module.nodes.push(Placeholder);
            const ctx = context.nextId(id);

            // keyword
            const name = parseIdentifier(node.data[1]);
            const superTypes = node.data[2] === null ? [] : node.data[2].map(x => parseType(x[3]));
            // generic
            // attributes
            const body = parseList(ctx, node.data[5][1]);

            // Generate member mapping
            const members = new Map();

            for (const member of body) {
                if (member.tag === Tag.ExprDeclaration) {
                    const decl = context.resolveGlobal(member.id);

                    members.set(decl.name, decl.id);
                }
            }

            const struct = new Nodes.DeclStruct(context.parentId, id, name, members, new Set(superTypes));
            module.nodes[id] = struct;
            return new Nodes.ExprDeclaration(id);
        }

        case PTag.DeclFunction: {
            // Create function
            const fn = new Nodes.DeclFunction(context.parentId, module.nodes.length, "", [], InferType, [], Nodes.FunctionFlags.None);
            module.nodes.push(fn);

            const ctx = context.next(fn);

            // keyword
            fn.name = parseIdentifier(node.data[1][1]);
            // compileTime
            fn.parameters = node.data[3].elements.map(variable => parseVariable(variable, ctx));
            fn.returnType = node.data[4] === null ? InferType : parseType(node.data[4][3]);
            // generic
            // attributes
            fn.body = (node.data[7].length === 2) ?
                parseList(ctx, node.data[7][1]) :
                [new Nodes.ExprReturn(parse(ctx, node.data[7][4]))];

            return new Nodes.ExprDeclaration(fn.id);
        }

        case PTag.DeclVariable: {
            // TODO: Support globals / fields / etc...
            // Currently context.parent isn't setup correctly, so we don't know what type our parent is.
            //  This matters because locals are stored with the function (ie. DeclFunction.locals) and fields/globals
            //  are stored with module (ie. DeclModule.nodes). This may change in the future.
            const variable = parseVariable(node, context);
            return new Nodes.ExprDeclaration(variable.id);
        }

        case PTag.StmtIf: {
            // TODO: Finish implementing if
            // keyword
            const condition = parse(context, node.data[1][2]);
            const body      = parseList(context, node.data[2]);
            // branches
            const elseBranch = node.data[4] === null ?
                [] :
                parseList(context, node.data[4][1]);

            // TODO: Resolve
            const firstBranch = new Nodes.ExprIfBranch(condition, body as any);
            
            return new Nodes.ExprIf([firstBranch], elseBranch as any);
        }

        case PTag.StmtWhile: {
            // keyword
            // compileTime
            const condition = parse(context, node.data[2][3]);
            const body      = parseList(context, node.data[3]);

            return new Nodes.ExprWhile(condition, body as any);
        }

        case PTag.StmtAssign: {
            // Target Operator Value
            const value     = parse(context, node.data[2]);

            switch (node.data[0].tag) {
                case PTag.ExprIdentifier: return new Nodes.ExprSetLocal(parseIdentifier(node.data[0].data[0]), value);
                case PTag.ExprIndexDot:   return new Nodes.ExprSetField(parse(context, node.data[0].data[0]), parseIdentifier(node.data[0].data[2]), value);
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
            const args      = node.data[2].elements.map((expr) => parse(context, expr));

            return new Nodes.ExprConstruct(target, args);
        }

        case PTag.ExprIdentifier: {
            const name = parseIdentifier(node.data[0]);

            switch (name) {
                // case "true":  return builtin.true;
                // case "false": return builtin.false;
                default:      return new Nodes.ExprRefName(name);
            }
        }

        case PTag.ExprIndexDot: {
            const target = parse(context, node.data[0]);
            const name   = parseIdentifier(node.data[2]);

            return new Nodes.ExprGetField(target, name);
        }

        case PTag.ExprCall: {
            const target = parse(context, node.data[0]);
            // compileTime
            const args   = node.data[2].elements.map((expr) => parse(context, expr));

            return new Nodes.ExprCall(target, args);
        }

        case PTag.ExprMacroCall: {
            const target = parseIdentifier(node.data[0]);
            const expr   = parse(context, node.data[2][1]);

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
    const value = node.data[5] === null ? null  : parse(context, node.data[5][3]);

    const variable = new Nodes.DeclVariable(context.parentId, UnresolvedId, name, type, value, flags);

    switch (context.parent.tag) {
        case Tag.DeclFunction: {
            variable.id = context.parent.variables.length;
            context.parent.variables.push(variable);
            break;
        }

        default: throw new Error('Not supported');
    }

    return variable;
}

function parseIdentifier(node: PNode) {
    return node.value;
}