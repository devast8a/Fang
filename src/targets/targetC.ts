import { Flags } from '../common/flags';
import { BadId, Children, Decl, Expr, Module, Node, Ref, RootId, Tag, Type } from '../nodes';

export class TargetC {
    private output = new Array<string>();
    private indent = [''];
    private indentCurrent = '';

    public constructor(
        private module: Module,
    ) { }

    public emitProgram() {
        this.emit("#include <stdint.h>\n");
        this.emit("#define FF_main main\n");

        const decl = this.module.children.decl;

        for (let id = 0; id < decl.length; id++) {
            this.emitDecl(decl[id], RootId, id);
        }
    }

    public emitDecl(decl: Decl | Ref, parent: number, id: number) {
        switch (decl.tag) {
            case Tag.DeclFunction: {
                this.emitSeparator();
                this.emitTypeName(decl.returnType, RootId);
                this.emit(" ", decl.name, "(");
                //this.emitParameters(ctx, decl.children.decls.slice(0, decl.parameters) as DeclVariable[]);
                this.emit(")");
                this.emitBody(decl.children, id);
                return;
            }
                
            case Tag.DeclStruct: {
                this.emitSeparator();
                this.emit("struct ", decl.name);
                this.emitDecls(decl.children.decl, id);
                return;
            }
                
            case Tag.DeclTrait: {
                this.emitSeparator();
                this.emit("struct ", decl.name);
                this.emitDecls(decl.children.decl, id);
                return;
            }
                
            case Tag.DeclVariable: {
                this.emitTypeName(decl.type, parent); // TODO: Keep track of parent
                this.emit(" ", decl.name);
                return;
            }
                
            case Tag.RefGlobal:
            case Tag.RefGlobalMember:
            case Tag.RefLocal:
            case Tag.RefName: {
                throw new Error(`Unreachable: '${Tag[decl.tag]}' should have been handled earlier.`);
            }
        }

        throw new Error(`Unreachable: Unhandled case '${Tag[(decl as any).tag]}'`);
    }

    public emitExpr(container: Children, parent: number, id: number) {
        const expr = container.expr[id];

        switch (expr.tag) {
            case Tag.ExprCall: {
                const fn = resolve(this.module, expr.target, parent);
                this.emit(fn.name);
                return;
            }
                
            case Tag.ExprConstant: {
                // TODO: Depending on the constant type we need to change encoding
                this.emit(expr.value);
                return;
            }

            case Tag.ExprDeclaration: {
                // Depends on the kind of declaration
                const decl = resolve(this.module, expr.target, parent);

                switch (decl.tag) {
                    case Tag.DeclVariable: {
                        this.emitTypeName(decl.type, parent);
                        this.emit(" ", decl.name);
                        if (decl.value !== null) {
                            this.emit(" = ");
                            this.emitExpr(container, parent, decl.value);
                        }
                        return;
                    }
                }
                throw new Error(`Unreachable: Unhandled case '${Tag[(expr as any).tag]}' for ExprDeclaration`);
            }
                
            case Tag.ExprReturn: {
                if (expr.value === null) {
                    this.emit("return;");
                } else {
                    this.emit("return ");
                    this.emitExpr(container, parent, expr.value);
                }
                return;
            }
        }
        throw new Error(`Unreachable: Unhandled case '${Tag[(expr as any).tag]}'`);
    }

    public emit(...text: string[]) {
        this.output.push(...text);
    }

    public emitTypeName(type: Type, parent: number) {
        switch (type.tag) {
            case Tag.TypeGet: {
                const name = resolve(this.module, type.target, parent).name;
                
                // TODO: Implement FFI system to allow aliasing underlying target identifiers
                switch (name) {
                    case "u8": this.emit("uint8_t"); return;
                    default: this.emit(name);
                }
                return;
            }

            case Tag.TypeInfer: {
                throw new Error(`Unreachable: '${Tag[type.tag]}' should have been handled earlier.`);
            }
        }

        throw new Error(`Unreachable: Unhandled case '${Tag[(type as any).tag]}'`);
    }

    public emitSeparator() {
        this.emit("\n\n", this.indentCurrent);
    }

    public emitNewline() {
        this.emit("\n", this.indentCurrent);
    }

    public emitDecls(decls: ReadonlyArray<Decl | Ref>, parent: number) {
        this.pushIndent();
        this.emit("{");
        for (let id = 0; id < decls.length; id++) {
            this.emitNewline();
            this.emitDecl(decls[id], parent, id);
            this.emit(";");
        }
        this.popIndent();
        this.emitNewline();
        this.emit("}");
    }

    public emitBody(children: Children, parent: number) {
        this.pushIndent();
        this.emit("{");
        for (const child of children.body) {
            this.emitNewline();
            this.emitExpr(children, parent, child);
            this.emit(";");
        }
        this.popIndent();
        this.emitNewline();
        this.emit("}");
    }

    private pushIndent() {
        this.indentCurrent += "  ";
        this.indent.push(this.indentCurrent);
    }

    private popIndent() {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this.indent.pop();
        this.indentCurrent = this.indent[this.indent.length - 1];
    }

    public toString() {
        return this.output.join("") + "\n";
    }
}

function resolve(module: Module, ref: Ref, parent: number): Decl {
    switch (ref.tag) {
        case Tag.RefGlobal:       return toDecl(module.children.decl[ref.id]);
        case Tag.RefGlobalMember: return toDecl(getChildren(module.children.decl[ref.id]).decl[ref.member]);
        case Tag.RefLocal:        return toDecl(getChildren(module.children.decl[parent]).decl[ref.id]);
        case Tag.RefName:         throw new Error(`Unexpected '${Tag[ref.tag]}', it should have been resolved during Name Resolution`);
    }

    throw new Error(`Unreachable: Unhandled case '${Tag[(ref as any).tag]}'`);
}

function toDecl(node: Node): Decl {
    switch (node.tag) {
        case Tag.DeclFunction:
        case Tag.DeclStruct:
        case Tag.DeclTrait:
        case Tag.DeclVariable:
            return node;
    }

    throw new Error(`Unexpected node of type '${Tag[node.tag]}', expected a Decl.`);
}

function getChildren(decl: Decl | Ref) {
    if (!Node.hasChildren(decl)) {
        throw new Error(`Unexpected node of type '${Tag[decl.tag]}', expected a node that has children.`);
    }

    return decl.children;
}
