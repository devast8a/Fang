import * as Nodes from '../nodes';
import { Decl, Node } from '../nodes';
import { PNode, PTag } from '../parser/post_processor';

const InferType = new Nodes.TypeInfer();

export function parseAst(ast: PNode[]) {
    const root = new Nodes.MutableChildren([], [], [], new Map());
    const state = new State(root, root);

    const body = [];
    for (const node of ast) {
        body.push(parse(state, node));
    }

    return state.finalize(body);
}

// TODO: ExprDecl
function parse(parent: State, node: PNode): number {
    switch (node.tag) {
        case PTag.DeclClass: {
            return parent.declare(Storage.RootDecl, (id) => {
                const children = parent.createChildState();

                // keyword name superTypes generic attributes body
                const name = parseIdentifier(node.data[1]);
                const superTypes = node.data[2]?.map(x => parseType(x[3]));
                const body = parseBody(children, node.data[5]);

                return new Nodes.DeclStruct(name, superTypes, children.finalize(body));
            });
        }

        case PTag.DeclFunction: {
            return parent.declare(Storage.RootDecl, (id) => {
                const children = parent.createChildState();

                // keyword name compileTime parameters returnType generic attributes body
                const name = parseIdentifier(node.data[1][1]);
                const returnType = parseTypeNull(node.data[4]?.[3]);
                const parameters = node.data[3].elements.map(parameter => parse(children, parameter));
                const body = parseBody(children, node.data[7]);

                return new Nodes.DeclFunction(name, returnType, parameters, children.finalize(body));
            });
        }
        case PTag.DeclParameter: {
            return parent.declare(Storage.Parameter, (id) => {
                // keyword name compileTime type attribute lifetime value
                const flags = convertVariableKeyword(node.data[0]?.[0]?.value);
                const name  = parseIdentifier(node.data[1]);
                const type  = parseTypeNull(node.data[3]?.[3]);
                const value = parseNull(parent, node.data[6]?.[3]);

                return new Nodes.DeclVariable(name, type, value, flags);
            });
        }

        case PTag.DeclTrait: {
            return parent.declare(Storage.RootDecl, (id) => {
                const children = parent.createChildState();

                // keyword name superTypes generic attributes body
                const name = parseIdentifier(node.data[1]);
                const superTypes = node.data[2]?.map(x => parseType(x[3]));
                const body = parseBody(children, node.data[5]);

                return new Nodes.DeclTrait(name, superTypes, children.finalize(body));
            });
        }

        case PTag.DeclVariable: {
            return parent.declare(Storage.ParentDecl, (id) => {
                // keyword name compileTime type attribute value
                const flags = convertVariableKeyword(node.data[0]?.[0]?.value);
                const name  = parseIdentifier(node.data[1]);
                const type  = parseTypeNull(node.data[3]?.[3]);
                const value = parseNull(parent, node.data[5]?.[3]);

                return new Nodes.DeclVariable(name, type, value, flags);
            });
        }

        case PTag.StmtReturn: {
            return parent.declare(Storage.ParentExpr, (id) => {
                // keyword value
                const value = parseNull(parent, node.data[1]?.[1]);

                return new Nodes.ExprReturn(value);
            });
        }

        case PTag.StmtWhile: {
            return parent.declare(Storage.ParentExpr, (id) => {
                // keyword compileTime condition body
                const condition = parse(parent, node.data[2][3]);
                const body = parseBody(parent, node.data[3]);

                return new Nodes.ExprWhile(condition, body);
            });
        }

        case PTag.ExprBinary: {
            switch (node.data.length) {
                case 3: {
                    return parent.declare(Storage.ParentExpr, (id) => {
                        // expression operator expression
                        const left = parse(parent, node.data[0]);
                        const symbol = node.data[1][0].value;
                        const right = parse(parent, node.data[2]);

                        return new Nodes.ExprCall(
                            new Nodes.RefName(`infix${symbol}`),
                            [left, right]
                        );
                    });
                }

                case 5: {
                    return parent.declare(Storage.ParentExpr, (id) => {
                        // expression operator expression
                        const left = parse(parent, node.data[0]);
                        const symbol = node.data[2][0].value;
                        const right = parse(parent, node.data[4]);

                        return new Nodes.ExprCall(
                            new Nodes.RefName(`infix${symbol}`),
                            [left, right]
                        );
                    });
                }

                default: throw new Error('Unreachable: Unhandled case');
            }
        }

        case PTag.ExprCall: {
            return parent.declare(Storage.ParentExpr, (id) => {
                // target compileTime arguments
                const target = parseRef(parent, node.data[0]);
                const args = node.data[2].elements.map((expr) => parse(parent, expr));

                return new Nodes.ExprCall(target, args);
            });
        }

        case PTag.ExprConstruct: {
            return parent.declare(Storage.ParentExpr, (id) => {
                // target compileTime arguments
                const type = parseType(node.data[0]);
                const args = node.data[2].elements.map((expr) => parse(parent, expr));

                return new Nodes.ExprCreate(type, args);
            });
        }

        case PTag.ExprIdentifier:
        case PTag.ExprIndexDot: {
            return parent.declare(Storage.ParentExpr, (id) => {
                // Delegates parsing to ExprRef
                const target = parseRef(parent, node);
                return new Nodes.ExprGet(target);
            });
        }

        case PTag.ExprMacroCall: {
            throw new Error('Not implemented yet');
        }

        case PTag.LiteralIntegerDec: {
            return parent.declare(Storage.ParentExpr, (id) => {
                return new Nodes.ExprConstant(null as any, parseInt(node.data[0].value));
            });
        }
    }

    throw new Error(`parse: No case for '${PTag[node.tag]}'`)
}

function parseRef(parent: State, node: PNode) {
    switch (node.tag) {
        case PTag.ExprIdentifier: {
            // identifier
            const name = parseIdentifier(node.data[0]);

            return new Nodes.RefName(name);
        }
            
        case PTag.ExprIndexDot: {
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

function parseNull(parent: State, node: PNode | null | undefined): number | null {
    return node === undefined || node === null ? null : parse(parent, node);
}

function parseBody(state: State, ast: PNode): number[] {
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
        case PTag.ExprIdentifier: {
            const name = parseIdentifier(node.data[0]);
            return new Nodes.TypeGet(new Nodes.RefName(name));
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

enum Storage {
    ParentDecl,
    ParentExpr,
    RootDecl,
    Parameter,
}

class State {
    public constructor(
        private readonly root: Nodes.MutableChildren,
        private readonly parent: Nodes.MutableChildren,
    ) { }

    public declare(storage: Storage, declare: (id: number, state: State) => Node): number {
        switch (storage) {
            case Storage.ParentDecl: return this.declare_impl(declare, this.parent.decl, Nodes.RefLocal);
            case Storage.ParentExpr: return this.declare_impl(declare, this.parent.expr, null);
            case Storage.RootDecl:   return this.declare_impl(declare, this.root.decl, Nodes.RefGlobal);
            case Storage.Parameter:  return this.declare_impl(declare, this.parent.decl, null);
            default: throw new Error('Unreachable: Unhandled case');
        }
    }

    /**
     * Implements storage logic for nodes
     * - Some declarations must always be stored directly in the module (DeclFunction, DeclStruct, etc...)
     * - Some declarations can be stored under other declarations (DeclVariable)
     * - Expressions are stored in a separate expression array (and have separate ids to declarations)
     * 
     * Declarations create an additional reference expression `ExprDeclaration` that marks where the declaration
     *  was declared.
     * 
     * @see State.declare
     */
    private declare_impl(
        declare: (id: number, state: State) => Node,
        nodes: Node[],
        Ref: {new(id: number): any} | null,
    ) {
        const id = nodes.length;
        nodes.push(null as any);
        nodes[id] = declare(id, this);

        const name = (nodes[id] as Decl).name;
        if (name !== undefined) {
            let mapping = this.parent.names.get(name);
            if (mapping === undefined) {
                mapping = [];
                this.parent.names.set(name, mapping);
            }
            mapping.push(id);
        }

        if (Ref === null) {
            return id;
        }

        // Must be a declaration at this point

        const eid = this.parent.expr.length;
        this.parent.expr.push(new Nodes.ExprDeclaration(new Ref(id)));

        return eid;
    }

    public createChildState() {
        return new State(this.root, new Nodes.MutableChildren([], [], null as any, new Map()));
    }

    public finalize(body: number[]) {
        return new Nodes.Children(
            this.parent.decl,
            this.parent.expr,
            body,
            this.parent.names,
        );
    }
}
