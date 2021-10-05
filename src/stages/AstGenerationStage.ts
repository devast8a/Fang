import * as Nodes from '../nodes';
import { Decl } from '../nodes';
import { PNode, PTag } from '../parser/post_processor';

const InferType = new Nodes.TypeInfer();

export function parseAst(ast: PNode[]) {

}

enum Storage {
    Parent,
    Module,
}

class State {
    public claimDeclId(id: number, decl: Decl, storage: Storage) {
        throw new Error('Method not implemented.');
    }

    public createChildState(id: number): State {
        throw new Error('Method not implemented.');
    }

    public reserveDeclId(storage: Storage): number {
        throw new Error('Method not implemented.');
    }

    public finalize(body: number[]) {
        return new Nodes.Children(
            [],
            [],
            body,
            new Map(),
        );
    }
}

function parse(
    parent: State,
    node: PNode
): number {
    switch (node.tag) {
        case PTag.DeclClass: {
            const id = parent.reserveDeclId(Storage.Module);
            const children = parent.createChildState(id);

            // keyword name superTypes generic attributes body
            const name = parseIdentifier(node.data[1]);
            const superTypes = node.data[2]?.map(x => parseType(x[3]));
            const body = parseBody(children, node.data[5]);

            const decl = new Nodes.DeclStruct(name, superTypes, children.finalize(body));

            parent.claimDeclId(id, decl, Storage.Module);
            return id;
        }

        case PTag.DeclFunction: {
            const id = parent.reserveDeclId(Storage.Module);
            const children = parent.createChildState(id);

            // keyword name compileTime parameters returnType generic attributes body
            const name = parseIdentifier(node.data[1]);
            const returnType = parseType(node.data[4], 3);
            const body = parseBody(children, node.data[7]);

            const decl = new Nodes.DeclFunction(name, returnType, [], children.finalize(body));

            parent.claimDeclId(id, decl, Storage.Module);
            return id;
        }

        case PTag.DeclTrait: {
            const id = parent.reserveDeclId(Storage.Module);
            const children = parent.createChildState(id);

            // keyword name superTypes generic attributes body
            const name = parseIdentifier(node.data[1]);
            const superTypes = node.data[2]?.map(x => parseType(x[3]));
            const body = parseBody(children, node.data[5]);

            const decl = new Nodes.DeclTrait(name, superTypes, children.finalize(body));

            parent.claimDeclId(id, decl, Storage.Module);
            return id;
        }

        case PTag.DeclVariable: {
            const id = parent.reserveDeclId(Storage.Parent);

            // keyword name compileTime type attribute value
            const flags = convertVariableKeyword(node.data[0]?.[0]?.value);
            const name  = parseIdentifier(node.data[1]);
            const type  = parseType(node.data[3], 3);
            // const value = parse(context, Nodes.UnresolvedId, node.data[5][3]);

            const decl = new Nodes.DeclVariable(name, type);

            parent.claimDeclId(id, decl, Storage.Parent);
            return id;
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

function parseBody(state: State, ast: PNode): number[] {
    throw new Error("Not supported");
}

function parseType(node: PNode, child?: number): Nodes.Type {
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