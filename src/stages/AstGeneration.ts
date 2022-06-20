import { Context } from '../ast/context';
import * as Nodes from '../ast/nodes';
import { Ref, RefId } from '../ast/nodes';
import { PNode, PTag } from '../parser/post_processor';
import { unimplemented, unreachable } from '../utils';

export function parseAst(root: Context, ast: PNode[]) {
    const body = [];

    for (const node of ast) {
        body.push(parse(root, node));
    }

    return body;
}

function parse(parent: Context, node: PNode): RefId {
    const p = parent.scope;

    switch (node.tag) {
        case PTag.PDeclFunction: {
            return parent.add(children => {
                // keyword name compileTime parameters returnType generic attributes body
                const name = parseIdentifier(node.data[1][1]);
                const parameters = node.data[3].elements.map(parameter => parse(children, parameter));
                const returnType = parseTypeNull(node.data[4]?.[3]);
                // const generics = parseGenericDeclNull(children, node.data[5]?.[1]);
                const attributes = node.data[6].map(attribute => parse(children, attribute[1][1]));
                const body = parseBodyNull(children, node.data[7]) ?? [];

                return new Nodes.Function(p, children.scope, name, returnType, parameters, body);
            });
        }

        case PTag.PDeclParameter: {
            return parent.add(children => {
                // keyword name compileTime type attribute lifetime value
                const flags = convertVariableKeyword(node.data[0]?.[0]?.value);
                const name  = parseIdentifier(node.data[1]);
                const type  = parseTypeNull(node.data[3]?.[3]);
                const value = parseNull(parent, node.data[6]?.[3]);

                return new Nodes.Variable(p, name, type);
            });
        }

        case PTag.PDeclStruct: {
            return parent.add(children => {
                // keyword name superTypes generic attributes body
                const name = parseIdentifier(node.data[1]);
                const superTypes = node.data[2]?.map(x => parseType(x[3]));
                // const generics = parseGenericDeclNull(children, node.data[3]?.[1]);
                const body = parseBodyNull(children, node.data[5]) ?? [];

                return new Nodes.Struct(p, children.scope, name, body);
            });
        }

        case PTag.PDeclTrait: {
            return parent.add(children => {
                // keyword name superTypes generic attributes body
                const name = parseIdentifier(node.data[1]);
                const superTypes = node.data[2]?.map(x => parseType(x[3]));
                const body = parseBodyNull(children, node.data[5]) ?? [];

                return new Nodes.Trait(p, children.scope, name, body);
            });
        }

        case PTag.PDeclVariable: {
            // keyword name compileTime type attribute value
            const flags = convertVariableKeyword(node.data[0]?.[0]?.value);
            const name  = parseIdentifier(node.data[1]);
            const type  = parseTypeNull(node.data[3]?.[3]);
            const value = parseNull(parent, node.data[5]?.[3]);

            const n  = parent.add(new Nodes.Variable(p, name, type));

            // TODO: Yeah not sure how I like this
            if (value !== null) {
                parent.add(new Nodes.Set(p, n, value))
            }

            return n;
        }

        case PTag.PExprBinary: {
            const [l, s, r] = node.data.length === 3 ? [0, 1, 2] : [0, 2, 4];

            // expression operator expression
            const left = parse(parent, node.data[l]);
            const symbol = parseOperator(node.data[s]);
            const right = parse(parent, node.data[r]);

            const target = new Nodes.RefName(`infix${symbol}`);
            return parent.add(new Nodes.Call(p, target, [left, right]));
        }

        case PTag.PExprCall: {
            const target = parseRef(parent, node.data[0]);
            const compileTime = node.data[1] !== null;
            const args = node.data[2].elements.map((expr) => parse(parent, expr));

            return parent.add(new Nodes.Call(p, target, args));
        }

        case PTag.PExprConstruct: {
            const type = parseType(node.data[0]);
            const args = node.data[2].elements.map((expr) => parse(parent, expr));

            throw unimplemented("Construction has not been implemented");
        }
            
        case PTag.PExprIf: {
            throw unimplemented("If is not yet implemented");
        }

        case PTag.PExprIdentifier: {
            const name = parseIdentifier(node.data[0]);
            const ref = new Nodes.RefName(name);

            return parent.add(new Nodes.Get(p, ref));
        }

        case PTag.PExprIndexDot: {
            // Delegates parsing to ExprRef
            const target = parseRef(parent, node);
            return parent.add(new Nodes.Get(p, target));
        }

        case PTag.PExprMacroCall: {
            // target compileTime argument
            const name = parseIdentifier(node.data[0]);
            const target = new Nodes.RefName(name);

            const argument = parse(parent, node.data[2]?.[1]);

            return parent.add(new Nodes.Call(p, target, [argument]));
        }
            
        case PTag.PExprMove: {
            // keyword expression
            const expression = parseRef(parent, node.data[1]);

            return parent.add(new Nodes.Move(p, expression));
        }

        case PTag.PExprReturn: {
            // keyword value
            const value = parseNull(parent, node.data[1]?.[1]);

            return parent.add(new Nodes.Return(p, value));
        }
            
        case PTag.PExprSet: {
            // target operator value
            const target = parseRef(parent, node.data[0]);
            const value = parse(parent, node.data[2]);

            return parent.add(new Nodes.Set(p, target, value));
        }

        case PTag.PExprWhile: {
            // keyword compileTime condition body
            const condition = parse(parent, node.data[2][3]);
            const body = parseBody(parent, node.data[3]);

            return parent.add(new Nodes.While(p, condition, body));
        }

        case PTag.PLiteralIntegerBin: {
            const value = node.data[0].value.replace(/_/g, '');
            const type = new Nodes.RefName('u32');
            const number = parseInt(value, 2);

            return parent.add(new Nodes.Constant(p, type, number));
        }

        case PTag.PLiteralIntegerDec: {
            const value = node.data[0].value.replace(/_/g, '');
            const type = new Nodes.RefName('u32');
            const number = parseInt(value, 10);

            return parent.add(new Nodes.Constant(p, type, number));
        }

        case PTag.PLiteralIntegerHex: {
            const value = node.data[0].value.replace(/_/g, '');
            const type = new Nodes.RefName('u32');
            const number = parseInt(value, 16);

            return parent.add(new Nodes.Constant(p, type, number));
        }

        case PTag.PLiteralString: {
            const value = node.data[0].value.slice(1,-1).replace(/\\(.)/, (_,c) => {
                switch (c) {
                    case '\\': return "\\";
                    case '"': return "\"";
                    case 'n': return "\n";
                    default: throw unimplemented(`String escape code: ${c}`)
                }
            });

            const type = new Nodes.RefName('str');
            return parent.add(new Nodes.Constant(p, type, value));
        }
    }

    throw unreachable(`Unhandled case ${PTag[node.tag]}`);
}

function parseRef(parent: Context, node: PNode) {
    switch (node.tag) {
        case PTag.PExprIdentifier: {
            // identifier
            const name = parseIdentifier(node.data[0]);

            return new Nodes.RefName(name);
        }
            
        //case PTag.PExprIndexDot: {
        //    // target operator name
        //    const target = parse(parent, node.data[0]);
        //    const name = parseIdentifier(node.data[2]);

        //    return new Nodes.RefFieldName(target, name);
        //}
            
    }

    throw unreachable(`Unhandled case ${node.tag}`);
}

function parseNull(parent: Context, node: PNode | null | undefined): RefId | null {
    return node === undefined || node === null ? null : parse(parent, node);
}

function parseBody(context: Context, ast: PNode): RefId[] {
    switch (ast.length) {
        case 2: {
            // whitespace body
            return ast[1].elements.map(node => parse(context, node));
        }

        case 4: {
            // whitespace => whitespace expression
            const expr = parse(context, ast[3]);

            return [context.add(new Nodes.Return(context.scope, expr))];
        }
            
        default: {
            throw new Error('Unreachable: Unhandled case');
        }
    }
}

function parseBodyNull(parent: Context, node: PNode): RefId[] | null {
    return node === undefined || node === null ? null : parseBody(parent, node);
}

// Yeah not sure about this one...
function parseType(node: PNode): Ref {
    switch (node.tag) {
        case PTag.PExprIdentifier: {
            // identifier
            const name = parseIdentifier(node.data[0]);
            return new Nodes.RefName(name);
        }
    }
    
    throw unreachable(`parseType unhandled case ${PTag[node.tag]}`);
}

function parseTypeNull(node: PNode | null | undefined): Ref {
    return node === undefined || node === null ? new Nodes.RefInfer() : parseType(node);
}

function convertVariableKeyword(keyword: string | undefined) {
    switch (keyword) {
        case "mut": return Nodes.VariableFlags.Mutable;
        case "val": return Nodes.VariableFlags.None;
        case "own": return Nodes.VariableFlags.Owns;
        case undefined: return Nodes.VariableFlags.None;
        default: throw new Error("Unreachable");
    }
}

function parseIdentifier(node: PNode) {
    // @see grammar.ne/Identifier
    return node.value;
}

function parseOperator(node: PNode) {
    // @see grammar.ne/OperatorSpaced
    if (node.length === 1) {
        return node[0].value;
    } else if (node[1] === null) {
        // TODO: Solve why it is possible to get a operator with two elements where the second is null
        return node[0].value;
    } else {
        return node[0].value + node[1].value;
    }
}

// function parseGenericDecl(children: Context, ast: PNode): GenericData {
//     // keyword parameters where-clauses
//     const parameters = ast[1].elements.map(parseIdentifier);
// 
//     return new GenericData(parameters.map(parameter => {
//         const id = children.add(new Nodes.DeclGenericParameter(parameter));
//         children.declare(id);
//         return id;
//     }), []);
// }
// 
// function parseGenericDeclNull(children: Context, ast: PNode | null | undefined) {
//     return ast === null || ast === undefined ? null : parseGenericDecl(children, ast);
// }