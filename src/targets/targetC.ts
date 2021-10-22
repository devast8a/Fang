import { Flags } from '../common/flags';
import { Context, Decl, DeclFunction, DeclVariable, DeclId, Expr, ExprId, Node, Tag, Type, DeclVariableFlags, DeclFunctionFlags, ExprIfCase, Children } from '../nodes';

function isBuiltin(decl: Decl) {
    if (decl.name.startsWith("infix") || decl.name.startsWith("prefix") || decl.name.startsWith("postfix")) {
        return true;
    }

    switch (decl.name) {
        case "Ptr":
        case "Size":
        case "bool":
        case "malloc":
        case "realloc":
        case "deref_ptr":
        case "printf":
        case "s16":
        case "s32":
        case "s64":
        case "s8":
        case "str":
        case "u16":
        case "u32":
        case "u64":
        case "u8":
            return true;
        
        default:
            return false;
    }
}

export class TargetC {
    private output = new Array<string>();
    private indent = [''];
    private indentCurrent = '';

    public emitProgram(context: Context) {
        this.emit("#include <stdint.h>\n");
        this.emit("#include <stdio.h>\n");
        this.emit("#include <stdlib.h>\n");

        const {decls, nodes} = context.module.children;

        // Forward declare structures
        this.emitSeparator();
        for (const id of decls) {
            const decl = nodes[id];

            if (decl.tag === Tag.DeclStruct) {
                if (isBuiltin(decl)) {
                    continue;
                }

                this.emit('struct ', decl.name, ';');
                this.emitNewline();
            }
        }

        // Forward declare functions
        this.emitSeparator();
        for (const id of decls) {
            const decl = nodes[id];

            if (decl.tag === Tag.DeclFunction) {
                if (isBuiltin(decl) || Flags.has(decl.flags, DeclFunctionFlags.Abstract)) {
                    continue;
                }

                const ctx = context.createChildContext(decl.children, id);

                this.emitTypeName(ctx, decl.returnType);
                this.emit(" ", decl.name, "(");
                this.emitParameters(ctx, decl.parameters);
                this.emit(");");
                this.emitNewline();
            }
        }

        for (let id = 0; id < nodes.length; id++) {
            const decl = nodes[id];
            this.emitDecl(context, decl as Decl, id);
        }
    }

    public emitDecl(context: Context, decl: Node, id: DeclId) {
        switch (decl.tag) {
            case Tag.DeclFunction: {
                if (isBuiltin(decl) || Flags.has(decl.flags, DeclFunctionFlags.Abstract)) {
                    return;
                }

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
                if (isBuiltin(decl)) {
                    return;
                }

                const ctx = context.createChildContext(decl.children, id);

                this.emitSeparator();
                this.emit("struct ", decl.name, " ");
                this.emitDecls(ctx, decl.children);
                this.emit(';');
                return;
            }
                
            case Tag.DeclTrait: {
                // TODO: Implement
                return;
            }
                
            case Tag.DeclVariable: {
                this.emitTypeName(context, decl.type); // TODO: Keep track of parent
                this.emit(" ", decl.name);
                return;
            }
                
            case Tag.ExprDeclaration: {
                return;
            }
        }

        throw new Error(`Unreachable: Unhandled case '${Tag[(decl as any).tag]}'`);
    }

    public emitExpr(context: Context, id: ExprId, expr?: Node) {
        expr = expr ?? Expr.get(context, id) as Node;

        switch (expr.tag) {
            case Tag.DeclVariable: {
                this.emitTypeName(context, expr.type);
                this.emit(" ", expr.name);
                if (expr.value !== null) {
                    this.emit(" = ");
                    this.emitExpr(context, expr.value);
                }
                return;
            }

            case Tag.ExprCall: {
                const fn = context.get(expr.target);

                if (fn.name.startsWith('infix')) {
                    this.emitExpr(context, expr.args[0]);
                    this.emit(' ', fn.name.slice(5), ' ');
                    this.emitExpr(context, expr.args[1]);
                } else if (fn.name === 'deref_ptr') {
                    this.emitExpr(context, expr.args[0]);
                    this.emit('[(')
                    this.emitExpr(context, expr.args[1]);
                    this.emit(') / 4');
                    this.emit(']')

                    if (expr.args.length === 3) {
                        this.emit(' = ');
                        this.emitExpr(context, expr.args[2]);
                    }
                } else {
                    // TODO: Implement this as an earlier compiler pass
                    // Implements self/this parameters, pushing the object as the first parameter when calling a method.
                    let args = expr.args;
                    if (expr.target.tag === Tag.RefFieldId) {
                        args = [expr.target.target].concat(args);
                    }

                    this.emit(fn.name, '(',);
                    this.emitArguments(context, fn, args);
                    this.emit(')');
                }
                return;
            }
                
            case Tag.ExprConstant: {
                // TODO: Depending on the constant type we need to change encoding
                // TODO: Dispatch on expr.type rather than typeof(expr.value)
                if (typeof(expr.value) === 'number') {
                    this.emit(expr.value.toString());
                } else {
                    this.emit(JSON.stringify(expr.value));
                }
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
                throw new Error(`Unreachable: Unhandled case '${Tag[(expr as any).tag]}' for ExprDeclaration`);
            }
                
            case Tag.ExprGet: {
                const targetRef = expr.target;

                switch (targetRef.tag) {
                    case Tag.RefFieldId: {
                        this.emitExpr(context, targetRef.target);
                        this.emit('->');
                        const field = Node.as(context.get(targetRef), DeclVariable);
                        this.emit(field.name);
                        return;
                    }

                    case Tag.RefLocal:
                    case Tag.RefGlobal:
                    case Tag.RefGlobalDecl: {
                        const target = context.get(targetRef) as Decl;
                        this.emit(target.name);
                        return;
                    }

                    case Tag.RefFieldName:
                    case Tag.RefName: {
                        throw new Error(`'${Tag[targetRef.tag]}' should have been resolved during name resolution.`);
                    }
                        
                        
                    default: {
                        throw new Error(`Unreachable: Unhandled case '${Tag[(targetRef as any).tag]}'`);
                    }
                }
            }
                
            case Tag.ExprIf: {
                // First case
                const first = Expr.get(context, expr.cases[0]) as ExprIfCase;

                this.emit('if (');
                this.emitExpr(context, first.condition!);
                this.emit(')');
                this.emitBody(context, first.body);

                // Other cases
                for (let i = 1; i < expr.cases.length; i++) {
                    const other = Node.as(Expr.get(context, expr.cases[i]), ExprIfCase);

                    if (other.condition === null) {
                        // Last case (else)
                        this.emit(' else ');
                        this.emitBody(context, other.body);
                    } else {
                        // Other cases
                        this.emit(' else if (');
                        this.emitExpr(context, other.condition);
                        this.emit(') ')
                        this.emitBody(context, other.body);
                    }
                }
                return;
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
                
            case Tag.ExprSet: {
                const targetRef = expr.target;

                switch (targetRef.tag) {
                    case Tag.RefFieldId: {
                        this.emitExpr(context, targetRef.target);
                        this.emit('->');
                        const field = Node.as(context.get(targetRef), DeclVariable);
                        this.emit(field.name, ' = ');
                        this.emitExpr(context, expr.value);
                        return;
                    }

                    case Tag.RefLocal:
                    case Tag.RefGlobal:
                    case Tag.RefGlobalDecl: {
                        const target = context.get(targetRef) as Decl;
                        this.emit(target.name, ' = ');
                        this.emitExpr(context, expr.value);
                        return;
                    }

                    case Tag.RefFieldName:
                    case Tag.RefName: {
                        throw new Error(`'${Tag[targetRef.tag]}' should have been resolved during name resolution.`);
                    }
                        
                        
                    default: {
                        throw new Error(`Unreachable: Unhandled case '${Tag[(targetRef as any).tag]}'`);
                    }
                }
            }
                
            case Tag.ExprWhile: {
                this.emit('while (');
                this.emitExpr(context, expr.condition);
                this.emit(') ');
                this.emitBody(context, expr.body);
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
            const param = Node.as(fn.children.nodes[paramId], DeclVariable);

            switch (arg.tag) {
                case Tag.ExprConstant: {
                    this.emitExpr(context, argId, arg);
                    break;
                }

                case Tag.ExprGet: {
                    const local = Node.as(context.get(arg.target), DeclVariable);

                    // TODO: argumentIsPtr is wrong for locals, needs a parameter flag
                    // TODO: Switch to pointers for large objects
                    const argumentIsPtr  = Flags.has(local.flags, DeclVariableFlags.Mutable)
                    const parameterIsPtr = Flags.has(param.flags, DeclVariableFlags.Mutable);

                    // Match pointer-ness of the parameter and the argument
                    if (arg.target.tag === Tag.RefFieldId) {
                        if (parameterIsPtr) {
                            this.emit("&");
                        }

                        this.emitExpr(context, arg.target.target);
                        this.emit(argumentIsPtr ? '->' : ".");
                        this.emit(local.name);
                    } else {
                        if (parameterIsPtr !== argumentIsPtr) {
                            this.emit(parameterIsPtr ? "&" : "*");
                        }
                        this.emit(local.name);
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

            const parameter = Node.as(context.container.nodes[parameterId], DeclVariable);

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
            case Tag.TypeGenericApply: {
                // Assume it's a Ptr<T>
                this.emitTypeName(context, type.args[0]);
                this.emit("*");
                return;
            }

            case Tag.TypeGet: {
                const name = (context.get(type.target) as Decl).name;
                
                // TODO: Implement FFI system to allow aliasing underlying target identifiers
                switch (name) {
                    case "u8":  this.emit("uint8_t"); return;
                    case "u16": this.emit("uint16_t"); return;
                    case "u32": this.emit("uint32_t"); return;
                    case "u64": this.emit("uint64_t"); return;

                    case "s8":  this.emit("int8_t"); return;
                    case "s16": this.emit("int16_t"); return;
                    case "s32": this.emit("int32_t"); return;
                    case "s64": this.emit("int64_t"); return;

                    case "Ptr": this.emit("uint32_t*"); return;
                    case "Size": this.emit("size_t"); return;

                    default: this.emit('struct ', name);
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

    public emitDecls(context: Context, children: Children) {
        const {decls, nodes} = children;

        this.pushIndent();
        this.emit("{");
        for (const id of decls) {
            this.emitNewline();
            this.emitDecl(context, nodes[id] as Decl, id);
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