import { builtin } from '../Builtin';
import { Flags } from '../common/flags';
import { Node, Tag, Type, DeclVariable, DeclFunction, VariableFlags, FunctionFlags, Context, Decl, Expr, DeclStruct } from '../nodes';

export class TargetC {
    private output = new Array<string>();
    public emit(...text: string[]) {
        this.output.push(...text);
    }

    private indent = [''];
    private indentCurrent = '';
    private context!: DeclFunction;

    public emitProgram(context: Context) {
        const nodes = context.module.nodes;

        this.emit("#include <stdint.h>\n");
        this.emit("#define FF_main main\n");

        for (let id = 0; id < nodes.length; id++) {
            const decl = nodes[id];

            if (decl.tag === Tag.DeclStruct) {
                // TODO: Replace with a proper FFI import system
                const ignore = ["FS_empty", "FS_bool", "FS_s8", "FS_s16", "FS_s32", "FS_s64", "FS_u8", "FS_u16", "FS_u32", "FS_u64", "FS_str"];
                if (ignore.indexOf(decl.name) !== -1) {
                    continue;
                }

                // C doesn't support nested functions, `transformUnnest` guarantees no nested functions.
                //  So we can keep track of the current function with a single variable.
                this.emitNewline();
                this.emit("struct ", decl.name, ";")
            }
        }

        this.emitNewline();

        for (let id = 0; id < nodes.length; id++) {
            const decl = nodes[id];

            if (decl.tag === Tag.DeclFunction) {
                // Don't emit abstract functions as they should never participate in code execution anyway. They should
                // always be instantiated in `transformInstantiate` into a concrete function.
                if (Flags.has(decl.flags, FunctionFlags.Abstract)) {
                    continue;
                }

                // TODO: Replace with a proper FFI import system
                if (/(infix|postfix|prefix)[^a-zA-Z0-9]/.test(decl.name)) {
                    continue;
                }

                // C doesn't support nested functions, `transformUnnest` guarantees no nested functions.
                //  So we can keep track of the current function with a single variable.
                this.context = decl;

                const ctx = context.nextId(id);

                this.emitNewline();
                this.emitTypeName(ctx, decl.returnType);
                this.emit(" ", decl.name, "(");
                this.emitParameters(ctx, decl.parameters);
                this.emit(");");
            }
        }

        for (let id = 0; id < nodes.length; id++) {
            this.emitDecl(context, nodes[id], id);
        }
    }

    public emitDecl(context: Context, decl: Decl, id: number) {
        switch (decl.tag) {
            case Tag.DeclSymbol:
                console.warn(`targetC>emitNode>${Tag[decl.tag]} not implemented`)
                return;

            case Tag.DeclFunction: {
                // Don't emit abstract functions as they should never participate in code execution anyway. They should
                // always be instantiated in `transformInstantiate` into a concrete function.
                if (Flags.has(decl.flags, FunctionFlags.Abstract)) {
                    return;
                }

                // TODO: Replace with a proper FFI import system
                if (/(infix|postfix|prefix)[^a-zA-Z0-9]/.test(decl.name)) {
                    return;
                }

                // C doesn't support nested functions, `transformUnnest` guarantees no nested functions.
                //  So we can keep track of the current function with a single variable.
                this.context = decl;

                const ctx = context.nextId(id);

                this.emitSeparator ();
                this.emitTypeName  (ctx, decl.returnType);
                this.emit          (" ", decl.name, "(");
                this.emitParameters(ctx, decl.parameters);
                this.emit          (")");
                this.emitBody      (ctx, decl.body);
                return;
            }

            case Tag.DeclStruct: {
                // TODO: Replace with a proper FFI import system
                const ignore = ["FS_empty", "FS_bool", "FS_s8", "FS_s16", "FS_s32", "FS_s64", "FS_u8", "FS_u16", "FS_u32", "FS_u64", "FS_str"];
                if (ignore.indexOf(decl.name) !== -1) {
                    break;
                }

                this.emitSeparator();
                this.emit         ("struct ", decl.name);

                // Emit body
                this.pushIndent();
                this.emit("{");
                const nodes = decl.children.nodes;
                for (let id = 0; id < nodes.length; id++) {
                    const child = nodes[id];
                    this.emitNewline();
                    switch (child.tag) {
                        case Tag.DeclVariable: this.emitDecl(context, child, id); break;
                        case Tag.ExprDeclaration: this.emit("/* TODO: Implement decl */"); break;
                        default: throw new Error("Unhandled case");
                    }
                    this.emit       (";");
                }
                this.popIndent();
                this.emitNewline();
                this.emit("}");

                this.emit         (";");

                return;
            }

            case Tag.DeclTrait: {
                // TODO: Implement
                return;
            }

            case Tag.DeclVariable: {
                this.emitTypeName(context, decl.type);
                this.emit        (" ", decl.name);

                if (decl.value !== null) {
                    this.emit    (" = ");
                    this.emitExpr(context, decl.value);
                }
                return;
            }
        }
    }

    public emitExpr(context: Context, expr: Expr) {
        switch (expr.tag) {
            case Tag.ExprCallField: {
                // this.emit         (node.field.name, "(");
                // this.emitArguments(node.field.parameters, node.args);
                // this.emit         (")");
                return;
            }

            case Tag.ExprCallStatic: {
                const target = context.resolveGlobal(expr.target) as DeclFunction;

                switch (target.name) {
                    // 
                    case "FF_infix_43": {
                        this.emitExpr(context, expr.args[0]);
                        this.emit    (" + ");
                        this.emitExpr(context, expr.args[1]);
                        return;
                    }

                    default: {
                        this.emit         (target.name, "(");
                        this.emitArguments(target.parameters, expr.args);
                        this.emit         (")");
                        return;
                    }
                }
            }

            case Tag.ExprConstant: {
                // TODO: Encode strings correctly
                this.emit(expr.value);
                return;
            }

            case Tag.ExprConstruct: {
                // Assume that we have either only positional arguments -or- only named arguments
                if (expr.args[0].tag === Tag.ExprNamedArgument) {
                    const target = Node.as(Type.resolve(context, expr.target), DeclStruct);

                    // TODO: This is wrong for structures with member functions
                    const fields = new Array(target.children.nodes.length);

                    // Collect all of the nodes by name
                    for (const arg of expr.args) {
                        if (arg.tag !== Tag.ExprNamedArgument) {
                            throw new Error(`Arguments are expected to all be named or positional.`);
                        }

                        const id = target.children.names.get(arg.name)?.[0];
                        if (id === undefined) {
                            throw new Error(`Expecting field named ${arg.name} in structure ${target.name}`);
                        }

                        fields[id] = arg.value;
                    }

                    // Emit nodes in the correct order
                    this.emit("{");
                    for (let id = 0; id < fields.length; id++) {
                        if (id > 0) {
                            this.emit(", ");
                        }

                        this.emitExpr(context, fields[id]);
                    }
                    this.emit("}");
                } else {
                    // Positional arguments
                    this.emit("{");
                    for (let id = 0; id < expr.args.length; id++) {
                        if (id > 0) {
                            this.emit(", ");
                        }

                        this.emitExpr(context, expr.args[id]);
                    }
                    this.emit("}");
                }
                return;
            }

            case Tag.ExprDeclaration: {
                // TODO: Handle declarations properly after we fix the local/global symbol index problem
                const variable = this.context.variables[expr.member];
                this.emitDecl(context, variable, expr.member);
                return;
            }

            case Tag.ExprGetField: {
                this.emitExpr(context, expr.object);
                this.emit    (".", expr.field as string);
                return;
            }

            case Tag.ExprGetLocal: {
                this.emit    (this.context.variables[expr.local as number].name);
                return;
            }

            case Tag.ExprSetField: {
                this.emitExpr(context, expr.object);
                this.emit    (".", expr.field as string, " = ");
                this.emitExpr(context, expr.value);
                return;
            }

            case Tag.ExprSetLocal: {
                this.emit    (this.context.variables[expr.local as number].name, " = ");
                this.emitExpr(context, expr.value);
                return;
            }

            case Tag.ExprDestroyLocal: {
                this.emit("DELETE");
                return;
            }

            case Tag.ExprIf: {
                this.emit    ("if (");
                this.emitExpr(context, expr.branches[0].condition);
                this.emit    (")");
                this.emitBody(context, expr.branches[0].body);
                // TODO: Support else if / else
                return;
            }

            case Tag.ExprReturn: {
                if (expr.expression !== null) {
                    this.emit    ("return ");
                    this.emitExpr(context, expr.expression);
                } else {
                    this.emit    ("return");
                }

                return;
            }
        }

        throw new Error(`targetC>emitNode>${Tag[expr.tag]}: Not implemented.`);
    }

    public emitTypeName(context: Context, type: Type | Decl) {
        // Mangle C specific names
        switch (type) {
            case builtin.declarations.empty: this.emit("void"); return;

            case builtin.declarations.bool:  this.emit("int"); return;

            case builtin.declarations.s8:    this.emit("int8_t"); return;
            case builtin.declarations.s16:   this.emit("int16_t"); return;
            case builtin.declarations.s32:   this.emit("int32_t"); return;
            case builtin.declarations.s64:   this.emit("int64_t"); return;

            case builtin.declarations.u8:    this.emit("uint8_t"); return;
            case builtin.declarations.u16:   this.emit("uint16_t"); return;
            case builtin.declarations.u32:   this.emit("uint32_t"); return;
            case builtin.declarations.u64:   this.emit("uint64_t"); return;
        }

        switch (type.tag) {
            case Tag.DeclStruct:    this.emit("struct ", type.name); return;
            case Tag.DeclTrait:     this.emit(type.name); return;

            case Tag.TypeRefDecl:   this.emit(type.declaration.name); return;
            case Tag.TypeRefStatic: this.emitTypeName(context, context.resolve(type)); return;
            case Tag.TypeInfer:     this.emit("INFER"); return;
            default:                throw new Error(`targetC>emitTypeName>${Tag[type.tag]}: Not implemented.`);
        }

        return "";
    }

    public emitArguments(params: DeclVariable[], args: Node[]) {
        for (let index = 0; index < args.length; index++) {
            if (index > 0) {
                this.emit(", ");
            }

            const arg = args[index];

            switch (arg.tag) {
                case Tag.ExprConstant: {
                    // TODO: Encode strings correctly
                    this.emit(arg.value);
                    break;
                }

                case Tag.ExprGetLocal: {
                    const local = this.context.variables[arg.local as number];

                    // TODO: argumentIsPtr is wrong for locals, needs a parameter flag
                    // TODO: Switch to pointers for large objects
                    const argumentIsPtr  = Flags.has(local.flags, VariableFlags.Mutates)
                    const parameterIsPtr = Flags.has(params[index].flags, VariableFlags.Mutates);

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

    public emitParameters(context: Context, parameters: DeclVariable[]) {
        for (let index = 0; index < parameters.length; index++) {
            if (index > 0) {
                this.emit(", ");
            }

            const parameter = parameters[index];

            this.emitTypeName(context, parameter.type);

            // Turn mutable parameters into pointers so we can modify their values
            const parameterIsPtr = Flags.has(parameter.flags, VariableFlags.Mutates);

            // Use `restrict` for pointers to inform the C compiler that arguments for this parameter are only accessed
            //  by this parameter so that it can better optimize output. ie. No aliasing for the argument's value. This
            //  is guaranteed by `checkLifetime`.
            if (parameterIsPtr) {
                this.emit("* restrict");
            }

            this.emit(" ", parameter.name);
        }
    }

    public emitBody(context: Context, nodes: Expr[]) {
        this.pushIndent();
        this.emit("{");
        for (const child of nodes) {
            this.emitNewline();
            this.emitExpr   (context, child);
            this.emit       (";");
        }
        this.popIndent();
        this.emitNewline();
        this.emit("}");
    }

    public emitSeparator() {
        this.emit("\n\n", this.indentCurrent);
    }

    public emitNewline() {
        this.emit("\n", this.indentCurrent);
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
