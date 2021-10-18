import * as Nodes from '../nodes';
import { MutContext, NodeId, RootId, Storage } from '../nodes';
import { PNode, PTag } from '../parser/post_processor';

const InferType = new Nodes.TypeInfer();

export function parseAst(ast: PNode[]) {
    const root = new Nodes.MutChildren([], [], [], new Map());
    const module = new Nodes.MutModule(root);

    const state = new MutContext(undefined as any, [], module, root, RootId);

    const body = [];
    for (const node of ast) {
        body.push(parse(state, node));
    }

    return {
        children: state.finalize(body),
    };
}

function parse(parent: MutContext, node: PNode): NodeId {
    switch (node.tag) {
        case PTag.PDeclFunction: {
            return parent.define(Storage.Module, (id) => {
                const children = parent.createChildContext2(id);

                // keyword name compileTime parameters returnType generic attributes body
                const name = parseIdentifier(node.data[1][1]);
                const returnType = parseTypeNull(node.data[4]?.[3]);
                const parameters = node.data[3].elements.map(parameter => parse(children, parameter));
                const attributes = node.data[6].map(attribute => parse(parent, attribute[1][1]));
                const body = parseBodyNull(children, node.data[7]) ?? [];

                return new Nodes.DeclFunction(name, returnType, parameters, children.finalize(body), Nodes.DeclFunctionFlags.None);
            });
        }
        case PTag.PDeclParameter: {
            return parent.define(Storage.Parent, (id) => {
                // keyword name compileTime type attribute lifetime value
                const flags = convertVariableKeyword(node.data[0]?.[0]?.value);
                const name  = parseIdentifier(node.data[1]);
                const type  = parseTypeNull(node.data[3]?.[3]);
                const value = parseNull(parent, node.data[6]?.[3]);

                return new Nodes.DeclVariable(name, type, value, flags);
            });
        }

        case PTag.PDeclStruct: {
            return parent.define(Storage.Module, (id) => {
                const children = parent.createChildContext2(id);

                // keyword name superTypes generic attributes body
                const name = parseIdentifier(node.data[1]);
                const superTypes = node.data[2]?.map(x => parseType(x[3]));
                const body = parseBodyNull(children, node.data[5]) ?? [];

                return new Nodes.DeclStruct(name, superTypes, children.finalize(body));
            });
        }

        case PTag.PDeclTrait: {
            return parent.define(Storage.Module, (id) => {
                const children = parent.createChildContext2(id);

                // keyword name superTypes generic attributes body
                const name = parseIdentifier(node.data[1]);
                const superTypes = node.data[2]?.map(x => parseType(x[3]));
                const body = parseBodyNull(children, node.data[5]) ?? [];

                return new Nodes.DeclTrait(name, superTypes, children.finalize(body));
            });
        }

        case PTag.PDeclVariable: {
            return parent.define(Storage.Parent, (id) => {
                // keyword name compileTime type attribute value
                const flags = convertVariableKeyword(node.data[0]?.[0]?.value);
                const name  = parseIdentifier(node.data[1]);
                const type  = parseTypeNull(node.data[3]?.[3]);
                const value = parseNull(parent, node.data[5]?.[3]);

                return new Nodes.DeclVariable(name, type, value, flags);
            });
        }

        case PTag.PExprBinary: {
            switch (node.data.length) {
                case 3: {
                    return parent.define(Storage.Parent, (id) => {
                        // expression operator expression
                        const left = parse(parent, node.data[0]);
                        const symbol = parseOperator(node.data[1]);
                        const right = parse(parent, node.data[2]);

                        return new Nodes.ExprCall(
                            new Nodes.RefName(`infix${symbol}`),
                            [left, right],
                            false
                        );
                    });
                }

                case 5: {
                    return parent.define(Storage.Parent, (id) => {
                        // expression operator expression
                        const left = parse(parent, node.data[0]);
                        const symbol = parseOperator(node.data[2]);
                        const right = parse(parent, node.data[4]);

                        return new Nodes.ExprCall(
                            new Nodes.RefName(`infix${symbol}`),
                            [left, right],
                            false,
                        );
                    });
                }

                default: throw new Error('Unreachable: Unhandled case');
            }
        }

        case PTag.PExprCall: {
            return parent.define(Storage.Parent, (id) => {
                // target compileTime arguments
                const target = parseRef(parent, node.data[0]);
                const compileTime = node.data[1] !== null;
                const args = node.data[2].elements.map((expr) => parse(parent, expr));

                return new Nodes.ExprCall(target, args, compileTime);
            });
        }

        case PTag.PExprConstruct: {
            return parent.define(Storage.Parent, (id) => {
                // target compileTime arguments
                const type = parseType(node.data[0]);
                const args = node.data[2].elements.map((expr) => parse(parent, expr));

                return new Nodes.ExprCreate(type, args);
            });
        }
            
        case PTag.PExprIf: {
            return parent.define(Storage.Parent, (id) => {
                // keyword condition body elseif else
                const firstCondition = parse(parent, node.data[1][2]);
                const firstBody = parseBody(parent, node.data[2]);
                const others = node.data[3];
                const lastBody = parseBodyNull(parent, node.data[4]?.[1]);

                const cases = [];
                
                // First case
                cases.push(parent.define(Storage.Parent, (id) => {
                    return new Nodes.ExprIfCase(firstCondition, firstBody);
                }));

                // Other cases
                for (const other of others) {
                    cases.push(parent.define(Storage.Parent, (id) => {
                        // keyword condition body
                        const condition = parse(parent, other[1][2]);
                        const body = parseBody(parent, other[2]);

                        return new Nodes.ExprIfCase(condition, body);
                    }));
                }

                // Last case (else)
                if (lastBody !== null) {
                    cases.push(parent.define(Storage.Parent, (id) => {
                        return new Nodes.ExprIfCase(null, lastBody);
                    }));
                }

                return new Nodes.ExprIf(cases);
            });
        }

        case PTag.PExprIdentifier:
        case PTag.PExprIndexDot: {
            return parent.define(Storage.Parent, (id) => {
                // Delegates parsing to ExprRef
                const target = parseRef(parent, node);
                return new Nodes.ExprGet(target);
            });
        }

        case PTag.PExprMacroCall: {
            throw new Error('Not implemented yet');
        }

        case PTag.PExprReturn: {
            return parent.define(Storage.Parent, (id) => {
                // keyword value
                const value = parseNull(parent, node.data[1]?.[1]);

                return new Nodes.ExprReturn(value);
            });
        }
            
        case PTag.PExprSet: {
            return parent.define(Storage.Parent, (id) => {
                // target operator value
                const target = parseRef(parent, node.data[0]);
                const value = parse(parent, node.data[2]);

                return new Nodes.ExprSet(target, value);
            });
        }

        case PTag.PExprWhile: {
            return parent.define(Storage.Parent, (id) => {
                // keyword compileTime condition body
                const condition = parse(parent, node.data[2][3]);
                const body = parseBody(parent, node.data[3]);

                return new Nodes.ExprWhile(condition, body);
            });
        }

        case PTag.PLiteralIntegerBin: {
            return parent.define(Storage.Parent, (id) => {
                const value = parseInt(node.data[0].value.slice(2).replace(/_/g, ''), 2);
                return new Nodes.ExprConstant(null as any, value);
            });
        }

        case PTag.PLiteralIntegerDec: {
            return parent.define(Storage.Parent, (id) => {
                const value = parseInt(node.data[0].value.replace(/_/g, ''), 10);
                return new Nodes.ExprConstant(null as any, value);
            });
        }

        case PTag.PLiteralIntegerHex: {
            return parent.define(Storage.Parent, (id) => {
                const value = parseInt(node.data[0].value.slice(2).replace(/_/g, ''), 16);
                return new Nodes.ExprConstant(null as any, value);
            });
        }

        case PTag.PLiteralString: {
            return parent.define(Storage.Parent, (id) => {
                const value = node.data[0].value.slice(1,-1).replace(/\\(.)/, (_,c) => {
                    switch (c) {
                        case '\\': return "\\";
                        case '"': return "\"";
                        case 'n': return "\n";
                        default: throw new Error("Not implemented yet");
                    }
                });

                return new Nodes.ExprConstant(null as any, value);
            });
        }
    }

    throw new Error(`parse: No case for '${PTag[node.tag]}'`)
}

function parseRef(parent: MutContext, node: PNode) {
    switch (node.tag) {
        case PTag.PExprIdentifier: {
            // identifier
            const name = parseIdentifier(node.data[0]);

            return new Nodes.RefName(name);
        }
            
        case PTag.PExprIndexDot: {
            // target operator name
            const target = parse(parent, node.data[0]);
            const name = parseIdentifier(node.data[2]);

            return new Nodes.RefFieldName(target, name);
        }
            
        default: {
            throw new Error('Unreachable: Unhandled case');
        }
    }
}

function parseNull(parent: MutContext, node: PNode | null | undefined): NodeId | null {
    return node === undefined || node === null ? null : parse(parent, node);
}

function parseBodyNull(parent: MutContext, node: PNode): NodeId[] | null {
    return node === undefined || node === null ? null : parseBody(parent, node);
}

function parseBody(state: MutContext, ast: PNode): NodeId[] {
    switch (ast.length) {
        case 2: {
            // whitespace body
            return ast[1].elements.map(node => parse(state, node));
        }

        case 4: {
            // whitespace => whitespace expression
            throw new Error('Not implemented yet');
        }
            
        default: {
            throw new Error('Unreachable: Unhandled case');
        }
    }
}

function parseType(node: PNode): Nodes.Type {
    switch (node.tag) {
        case PTag.PExprIdentifier: {
            // identifier
            const name = parseIdentifier(node.data[0]);
            return new Nodes.TypeGet(new Nodes.RefName(name));
        }
            
        case PTag.PExprGenericApply: {
            // identifier args
            const target = parseType(node.data[0]);
            const args = node.data[1].elements.map(parseType);

            return new Nodes.TypeGenericApply(target, args);
        }
    }
    
    throw new Error(`parseType: No case for '${PTag[node.tag]}'`);
}

function parseTypeNull(node: PNode | null | undefined): Nodes.Type {
    return node === undefined || node === null ? InferType : parseType(node);
}

function convertVariableKeyword(keyword: string | undefined) {
    switch (keyword) {
        case "mut": return Nodes.DeclVariableFlags.Mutable;
        case "val": return Nodes.DeclVariableFlags.None;
        case "own": return Nodes.DeclVariableFlags.Owns;
        case undefined: return Nodes.DeclVariableFlags.None;
        default: throw new Error("Unreachable");
    }
}

function parseIdentifier(node: PNode) {
    return node.value;
}

function parseOperator(node: PNode) {
    // @see grammar.ne: OperatorSpaced
    if (node.length === 1) {
        return node[0].value;
    } else if (node[1] === null) {
        // TODO: Solve why it is possible to get a operator with two elements where the second is null
        return node[0].value;
    } else {
        return node[0].value + node[1].value;
    }
}

export interface Position {
    offset: number;
    line: number;
    column: number;
}

export interface Location {
    start: Position;
    end: Position;
}

function getLocation(node: any): Location {
    return {
        start: getStart(node)!,
        end: getEnd(node)!,
    }
}

function getStart(node: any): (Position | null) {
    if (node === null) {
        return null;
    }

    if (node.data instanceof Array) {
        return getStart(node.data)
    }

    if (node.elements instanceof Array) {
        return getStart(node.begin);
    }

    if (node instanceof Array) {
        for (let index = 0; index < node.length; index++) {
            const result = getStart(node[index]);

            if (result !== null) {
                return result
            }
        }

        return null;
    }

    if (node.offset !== undefined) {
        return {
            offset: node.offset,
            line: node.line,
            column: node.col,
        };
    }

    return null;
}

function getEnd(node: any): (Position | null) {
    if (node === null) {
        return null;
    }

    if (node.data instanceof Array) {
        return getEnd(node.data)
    }

    if (node.elements instanceof Array) {
        return getEnd(node.end);
    }

    if (node instanceof Array) {
        for (let index = node.length - 1; index >= 0; index--) {
            const result = getEnd(node[index]);

            if (result !== null) {
                return result
            }
        }
    }

    if (node.offset !== undefined) {
        return {
            offset: node.offset + node.text.length,
            line: node.line,
            column: node.col,
        };
    }

    return null;
}