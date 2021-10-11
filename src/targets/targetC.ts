import { Flags } from '../common/flags';
import { Context, Decl, DeclFunction, DeclVariable, DeclId, Expr, ExprId, Node, Ref, Tag, Type, DeclVariableFlags } from '../nodes';

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

    public emitDecl(context: Context, decl: Decl | Ref, id: DeclId) {
        switch (decl.tag) {
            case Tag.DeclFunction: {
                const ctx = context.createChildContext(decl.children, id);

                this.emitSeparator();
                this.emitTypeName(ctx, decl.returnType);
                this.emit(" ", decl.name, "(");
                this.emitParameters(ctx, decl.parameters);
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

    public emitExpr(context: Context, id: ExprId, expr?: Expr) {
        expr = expr ?? Expr.get(context, id);

        switch (expr.tag) {
            case Tag.ExprCall: {
                const fn = Node.as(Ref.resolve(context, expr.target), DeclFunction);

                if (fn.name.startsWith('infix')) {
                    this.emitExpr(context, expr.args[0]);
                    this.emit(' + ');
                    this.emitExpr(context, expr.args[1]);
                } else {
                    this.emit(fn.name, '(',);
                    this.emitArguments(context, fn, expr.args);
                    this.emit(')');
                }
                return;
            }
                
            case Tag.ExprConstant: {
                // TODO: Depending on the constant type we need to change encoding
                this.emit(expr.value);
                return;
            }
                
            case Tag.ExprCreate: {
                this.emit("{",);
                let first = true;
                for (const arg of expr.args) {
                    if (!first) {
                        this.emit(", ");
                    } else {
                        first = false;
                    }

                    this.emitExpr(context, arg);
                }
                this.emit("}",);
                return;
            }

            case Tag.ExprDeclaration: {
                // Depends on the kind of declaration
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
                
            case Tag.ExprGet: {
                const targetRef = expr.target;

                switch (targetRef.tag) {
                    case Tag.RefFieldId: {
                        throw new Error(`Not implemented yet`);
                    }

                    case Tag.RefFieldName: {
                        this.emitExpr(context, targetRef.target);
                        this.emit('.', targetRef.field);
                        return;
                    }

                    case Tag.RefLocal:
                    case Tag.RefGlobal:
                    case Tag.RefGlobalDecl: {
                        const target = Ref.resolve(context, targetRef);
                        this.emit(target.name);
                        return;
                    }

                    case Tag.RefName: {
                        throw new Error(`'${Tag[targetRef.tag]}' (for the identifier '${targetRef.name}') should have been resolved during name resolution.`);
                    }
                        
                        
                    default: {
                        throw new Error(`Unreachable: Unhandled case '${Tag[(targetRef as any).tag]}'`);
                    }
                }
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

    public emitArguments(context: Context, fn: DeclFunction, args: ReadonlyArray<ExprId>) {
        for (let index = 0; index < args.length; index++) {
            if (index > 0) {
                this.emit(", ");
            }

            const argId = args[index];
            const arg = Expr.get(context, argId);

            const paramId = fn.parameters[index];
            const param = Node.as(fn.children.decls[paramId], DeclVariable);

            switch (arg.tag) {
                case Tag.ExprConstant: {
                    // TODO: Encode strings correctly
                    this.emit(arg.value);
                    break;
                }

                case Tag.ExprGet: {
                    const local = Node.as(Ref.resolve(context, arg.target), DeclVariable);

                    // TODO: argumentIsPtr is wrong for locals, needs a parameter flag
                    // TODO: Switch to pointers for large objects
                    const argumentIsPtr  = Flags.has(local.flags, DeclVariableFlags.Mutable)
                    const parameterIsPtr = Flags.has(param.flags, DeclVariableFlags.Mutable);

                    // Match pointer-ness of the parameter and the argument
                    if (parameterIsPtr) {
                        if (argumentIsPtr) {
                            this.emit(local.name);
                        } else {
                            this.emit("&", local.name);
                        }
                    } else {
                        if (argumentIsPtr) {
                            this.emit("*", local.name);
                        } else {
                            this.emit(local.name);
                        }
                    }

                    break;
                }

                default: {
                    throw new Error(`targetC > emitArguments > ${Tag[arg.tag]}: Not implemented.`);
                }
            }
        }
    }

    public emitParameters(context: Context, parameters: DeclId[]) {
        let first = true;

        for (const parameterId of parameters) {
            if (!first) {
                this.emit(", ");
            } else {
                first = false;
            }

            const parameter = Node.as(context.container.decls[parameterId], DeclVariable);

            this.emitTypeName(context, parameter.type);

            // Turn mutable parameters into pointers so we can modify their values
            const parameterIsPtr = Flags.has(parameter.flags, DeclVariableFlags.Mutable);

            // Use `restrict` for pointers to inform the C compiler that arguments for this parameter are only accessed
            //  by this parameter so that it can better optimize output. ie. No aliasing for the argument's value. This
            //  is guaranteed by `checkLifetime`.
            if (parameterIsPtr) {
                this.emit("* restrict");
            }

            this.emit(" ", parameter.name);
        }
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

    public emitBody(context: Context, exprs: ReadonlyArray<ExprId>) {
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