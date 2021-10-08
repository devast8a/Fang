import { Children, Context, Decl, DeclFunction, Expr, Module, Node, Ref, RefExpr, RootId, Tag, Type } from '../nodes';

export class TargetC {
    private output = new Array<string>();
    private indent = [''];
    private indentCurrent = '';

    public emitProgram(context: Context) {
        this.emit("#include <stdint.h>\n");
        this.emit("#define FF_main main\n");

        const decl = context.module.children.decls;
        for (let id = 0; id < decl.length; id++) {
            this.emitDecl(context, decl[id] as Decl, id);
        }
    }

    public emitDecl(context: Context, decl: Decl | Ref, id: number) {
        switch (decl.tag) {
            case Tag.DeclFunction: {
                const ctx = context.createChildContext(decl.children, id);

                this.emitSeparator();
                this.emitTypeName(ctx, decl.returnType);
                this.emit(" ", decl.name, "(");
                //this.emitParameters(ctx, decl.children.decls.slice(0, decl.parameters) as DeclVariable[]);
                this.emit(")");
                this.emitBody(ctx, decl.children.body);
                return;
            }
                
            case Tag.DeclStruct: {
                const ctx = context.createChildContext(decl.children, id);

                this.emitSeparator();
                this.emit("struct ", decl.name);
                this.emitDecls(ctx, decl.children.decls);
                return;
            }
                
            case Tag.DeclTrait: {
                const ctx = context.createChildContext(decl.children, id);

                this.emitSeparator();
                this.emit("struct ", decl.name);
                this.emitDecls(ctx, decl.children.decls);
                return;
            }
                
            case Tag.DeclVariable: {
                this.emitTypeName(context, decl.type); // TODO: Keep track of parent
                this.emit(" ", decl.name);
                return;
            }
        }

        throw new Error(`Unreachable: Unhandled case '${Tag[(decl as any).tag]}'`);
    }

    public emitExpr(context: Context, id: number, expr?: Expr) {
        expr = expr ?? Expr.get(context, id);

        switch (expr.tag) {
            case Tag.ExprCall: {
                const fn = Node.as(Ref.resolve(context, expr.target), DeclFunction);

                if (fn.name.startsWith('infix')) {
                    this.emitArgument(context, fn, expr.args, 0);
                    this.emit(' + ');
                    this.emitArgument(context, fn, expr.args, 1);
                } else {
                    this.emit(fn.name);
                }
                return;
            }
                
            case Tag.ExprConstant: {
                // TODO: Depending on the constant type we need to change encoding
                this.emit(expr.value);
                return;
            }
                
            case Tag.ExprCreate: {
                return;
            }

            case Tag.ExprDeclaration: {
                // Depends on the kind of declaration
                console.log(expr, expr.target);
                const decl = Ref.resolve(context, expr.target);

                switch (decl.tag) {
                    case Tag.DeclVariable: {
                        this.emitTypeName(context, decl.type);
                        this.emit(" ", decl.name);
                        if (decl.value !== null) {
                            this.emit(" = ");
                            this.emitExpr(context, decl.value);
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
                    this.emitExpr(context, expr.value);
                }
                return;
            }
        }
        throw new Error(`Unreachable: Unhandled case '${Tag[(expr as any).tag]}'`);
    }

    public emit(...text: string[]) {
        this.output.push(...text);
    }

    public emitArgument(context: Context, fn: DeclFunction, args: ReadonlyArray<RefExpr>, index: number) {
        return;
    }

    public emitTypeName(context: Context, type: Type) {
        switch (type.tag) {
            case Tag.TypeGet: {
                const name = Ref.resolve(context, type.target).name;
                
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

    public emitDecls(context: Context, decls: ReadonlyArray<Decl | Ref>) {
        this.pushIndent();
        this.emit("{");
        for (let id = 0; id < decls.length; id++) {
            this.emitNewline();
            this.emitDecl(context, decls[id], id);
            this.emit(";");
        }
        this.popIndent();
        this.emitNewline();
        this.emit("}");
    }

    public emitBody(context: Context, exprs: ReadonlyArray<RefExpr>) {
        this.pushIndent();
        this.emit("{");
        for (const id of exprs) {
            this.emitNewline();
            this.emitExpr(context, id);
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
        this.indent.pop();
        this.indentCurrent = this.indent[this.indent.length - 1];
    }

    public toString() {
        return this.output.join("") + "\n";
    }
}