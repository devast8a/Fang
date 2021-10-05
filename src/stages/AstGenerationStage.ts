/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { builtin } from '../Builtin';
import { ParseContext, ParseStage } from '../compile';
import * as Nodes from '../nodes';
import { Children, Decl, Expr, Module, Node, RootId } from '../nodes';
import { PNode, PTag } from '../parser/post_processor';

const InferType   = new Nodes.TypeInfer();

export class AstGenerationStage implements ParseStage {
    public name = "Ast Generation";

    public execute(nodes: any, {context}: ParseContext): Node[] {
        // TODO: node is PNode, violating the interface

        const output = [];

        const ctx = new Context(context.module, RootId, new Children());

        for (const node of nodes) {
            output.push(lookup(ctx, parse(ctx, RootId, node)));
        }

        return output;
    }
}

function reserveDeclId(context: Context) {
    const nodes = context.module.nodes;

    const id = nodes.length;
    nodes.push(null as any);
    return id;
}

function assignDecl(context: Context, id: number, decl: Decl) {
    context.module.nodes[id] = decl;

    const exprs = context.container.exprs;
    const expr_id = exprs.length;

    const expr = new Nodes.ExprDeclaration(Nodes.UnresolvedId, RootId, id);
    exprs.push(expr);

    return expr_id;
}

function reserveExprId(context: Context) {
    const exprs = context.container.exprs;

    const id = exprs.length;
    exprs.push(null as any);
    return id;
}

function assignExpr(context: Context, id: number, expr: Expr) {
    const exprs = context.container.exprs;
    exprs[id] = expr;
    return id;
}

function reserveMemberId(context: Context) {
    const decls = context.container.decls;
    
    const id = decls.length;
    decls.push(null as any);
    return id;
}

function assignMember(context: Context, id: number, decl: Decl) {
    const container = context.container;

    let mapping = container.names.get(decl.name);
    if (mapping === undefined) {
        mapping = [];
        container.names.set(decl.name, mapping);
    }

    mapping.push(id);
    container.decls[id] = decl as any;

    const exprs = context.container.exprs;
    const expr_id = exprs.length;

    const expr = new Nodes.ExprDeclaration(Nodes.UnresolvedId, context.containerId, id);
    exprs.push(expr);

    return expr_id;
}

class Context {
    constructor(
        readonly module: Module,
        readonly containerId: number,
        readonly container: Children,
    ) { }
    
    createChildContext(container: number) {
        return new Context(this.module, container, new Children());
    }
}

function lookup(context: Context, id: number): Expr
function lookup(context: Context, id: number | null): Expr | null
function lookup(context: Context, id: number | null): Expr | null {
    if (id === null) {
        return null;
    }

    return context.container.exprs[id];
}

function parse(
    context: Context,
    parent: number,
    node: PNode
): number {
    switch (node.tag) {
        case PTag.DeclClass: {
            const id = reserveDeclId(context);
            const children = context.createChildContext(id);

            // keyword name superTypes generic attributes body
            const name = parseIdentifier(node.data[1]);
            const superTypes = node.data[2]?.map(x => parseType(x[3]));
            // TODO: Use output
            const body = parseBody(children, parent, node.data[5]);

            const decl = new Nodes.DeclStruct(context.containerId, name, children.container, superTypes);
            return assignDecl(context, id, decl);
        }

        case PTag.DeclFunction: {
            const id = reserveDeclId(context);
            const children = context.createChildContext(id);

            // keyword name compileTime parameters returnType generic attributes body
            const name = parseIdentifier(node.data[1][1]);
            const parameters = node.data[3].elements.map(parameter => {
                // keyword name compileTime type attribute lifetime value
                const flags = convertVariableKeyword(parameter.data[0]?.[0]?.value);
                const name  = parseIdentifier(parameter.data[1]);
                const type  = parameter.data[3] === null ? InferType : parseType(parameter.data[3][3]);
                // const value = parameter.data[5] === null ? null  : parse(context, id, parameter.data[5][3]);

                const decl = new Nodes.DeclVariable(children.containerId, name, type, null, flags);
                children.container.decls.push(decl);
                return decl;
            });
            const returnType = node.data[4] === null ? InferType : parseType(node.data[4][3]);
            children.container.body = parseBodyId(children, parent, node.data[7]);

            const decl = new Nodes.DeclFunction(context.containerId, name, parameters.length, returnType, children.container, Nodes.FunctionFlags.None);

            return assignDecl(context, id, decl);
        }

        case PTag.DeclTrait: {
            const id = reserveDeclId(context);
            const children = context.createChildContext(id);

            // keyword name superTypes generic attributes body
            const name = parseIdentifier(node.data[1]);
            const superTypes = node.data[2]?.map(x => parseType(x[3]));
            // TODO: Use output
            const body = parseBody(children, parent, node.data[5]);

            const decl = new Nodes.DeclTrait(context.containerId, name, children.container, superTypes);
            return assignDecl(context, id, decl);
        }

        case PTag.DeclVariable: {
            const id = reserveMemberId(context);

            // keyword name compileTime type attribute value
            const flags = convertVariableKeyword(node.data[0]?.[0]?.value);
            const name  = parseIdentifier(node.data[1]);
            const type  = node.data[3] === null ? InferType : parseType(node.data[3][3]);
            const value = node.data[5] === null ? null  : parse(context, Nodes.UnresolvedId, node.data[5][3]);

            const decl = new Nodes.DeclVariable(context.containerId, name, type, lookup(context, value), flags);
            return assignMember(context, id, decl);
        }

        case PTag.StmtWhile: {
            const id = reserveExprId(context);

            // keyword compileTime condition body
            const condition = parse(context, id, node.data[2][3]);
            const body      = parseBody(context, id, node.data[3])

            const expr = new Nodes.ExprWhile(parent, lookup(context, condition), body as any);
            return assignExpr(context, id, expr);
        }

        case PTag.StmtReturn: {
            const id = reserveExprId(context);

            // keyword value
            const value = node.data[1] === null ? null : parse(context, id, node.data[1][1]);

            const expr = new Nodes.ExprReturn(parent, lookup(context, value));
            return assignExpr(context, id, expr);
        }

        case PTag.LiteralIntegerDec: {
            const id = reserveExprId(context);

            const expr = new Nodes.ExprConstant(parent, builtin.references.u64, parseInt(node.data[0].value));

            return assignExpr(context, id, expr);
        }

        case PTag.PExprArgument: {
            const id = reserveExprId(context);

            // name whitespace operator whitespace value
            const name  = parseIdentifier(node.data[0]);
            const value = parse(context, id, node.data[4]);

            const expr = new Nodes.ExprNamedArgument(parent, name, lookup(context, value));
            return assignExpr(context, id, expr);
        }

        case PTag.ExprBinary: {
            switch (node.data.length) {
                case 3: {
                    const id = reserveExprId(context);

                    // expression operator expression
                    const left = parse(context, id, node.data[0]);
                    const symbol = node.data[1][0].value;
                    const right = parse(context, id, node.data[2]);

                    const name = new Nodes.ExprRefName(parent, `infix${symbol}`);

                    const expr = new Nodes.ExprCall(parent, name, [lookup(context, left), lookup(context, right)]);
                    return assignExpr(context, id, expr);
                }

                case 5: {
                    const id = reserveExprId(context);

                    // expression whitespace operator whitespace expression
                    const left = parse(context, id, node.data[0]);
                    const symbol = node.data[2][0].value;
                    const right = parse(context, id, node.data[4]);

                    const name = new Nodes.ExprRefName(parent, `infix${symbol}`);

                    const expr = new Nodes.ExprCall(parent, name, [lookup(context, left), lookup(context, right)]);
                    return assignExpr(context, id, expr);
                }

                default: {
                    throw new Error('Unreachable')
                }
            }
        }

        case PTag.ExprConstruct: {
            const id = reserveExprId(context);

            // target compileTime arguments
            const target    = parseType(node.data[0]);
            const args      = node.data[2].elements.map((expr) => lookup(context, parse(context, id, expr)));

            const expr = new Nodes.ExprConstruct(parent, target, args);
            return assignExpr(context, id, expr);
        }

        case PTag.ExprIdentifier: {
            const id = reserveExprId(context);

            // identifier
            const name = parseIdentifier(node.data[0]);

            const expr = new Nodes.ExprRefName(parent, name);
            return assignExpr(context, id, expr);
        }

        case PTag.ExprIndexDot: {
            const id = reserveExprId(context);

            // target operator name
            const target = parse(context, id, node.data[0]);
            const name   = parseIdentifier(node.data[2]);

            const expr = new Nodes.ExprGetField(parent, lookup(context, target), name);
            return assignExpr(context, id, expr);
        }

        case PTag.ExprCall: {
            const id = reserveExprId(context);

            // target compileTime args
            const target = parse(context, id, node.data[0]);
            const args   = node.data[2].elements.map((expr) => lookup(context, parse(context, id, expr)));

            const expr = new Nodes.ExprCall(parent, lookup(context, target), args);
            return assignExpr(context, id, expr);
        }

        case PTag.ExprMacroCall: {
            const id = reserveExprId(context);
            
            // target compileTime argument
            const target = parseIdentifier(node.data[0]);
            const arg    = parse(context, id, node.data[2][1]);

            const expr = new Nodes.ExprMacroCall(parent, target, [lookup(context, arg)]);
            return assignExpr(context, id, expr);
        }
    }

    throw new Error(`parseExpr: No case for '${PTag[node.tag]}'`)
}

function parseBody(context: Context, parent: number, ast: PNode): Expr[] {
    if (ast.length === 2) {
        // whitespace body
        return ast[1].elements.map(node => lookup(context, parse(context, parent, node)));
    } else {
        // whitespace "=>" whitespace expression
        const expression = parse(context, parent, ast[4]);
        return [new Nodes.ExprReturn(parent, lookup(context, expression))];
    }
}

function parseBodyId(context: Context, parent: number, ast: PNode): number[] {
    if (ast.length === 2) {
        // whitespace body
        return ast[1].elements.map(node => parse(context, parent, node));
    } else {
        throw new Error('Not implemented yet');
    }
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

function parseIdentifier(node: PNode) {
    return node.value;
}