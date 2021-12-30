import { Flags } from '../common/flags';
import { Context, Decl, DeclFunction, DeclVariable, DeclId, ExprId, Node, Tag, Type, DeclVariableFlags, DeclFunctionFlags, ExprIfCase, Children, RefLocalId, DeclStruct, TypeGet, unreachable, NodeId } from '../nodes';

export function isGeneric(decl: DeclStruct) {
    return decl.generics !== null && decl.generics.parameters.length > 0;
}

export function convertBuiltinName(context: Context, decl: Decl): string | null {
    const name = decl.name;

    if (name.startsWith("infix") || name.startsWith("prefix") || name.startsWith("postfix")) {
        return "operator";
    }

    if (name.startsWith("Ptr_")) {
        const arg = context.get(((decl as DeclStruct).generics!.args[0] as TypeGet).target);
        return convertBuiltinName(context, arg) + "*";
    }

    switch (name) {
        case "u8":  return "uint8_t";
        case "u16": return "uint16_t";
        case "u32": return "uint32_t";
        case "u64": return "uint64_t";

        case "s8":  return "int8_t";
        case "s16": return "int16_t";
        case "s32": return "int32_t";
        case "s64": return "int64_t";

        case "Ptr":  return "void*";
        case "Size": return "size_t";
        case "bool": return "bool";
        case "void": return "void";
        case "str":  return "char*";

        // Builtin functions
        case "alias":
        case "malloc":
        case "realloc":
        case "deref_ptr":
        case "printf":
            return name;
    }

    return null;
}

export function isBuiltin(context: Context, decl: Decl) {
    return convertBuiltinName(context, decl) !== null;
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
        for (let id = 0; id < nodes.length; id++) {
            const decl = nodes[id];

            if (decl.tag === Tag.DeclStruct) {
                if (isBuiltin(context, decl) || isGeneric(decl)) {
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
                const ctx = context.createChildContext(decl.children, id);

                if (isBuiltin(ctx, decl) || Flags.has(decl.flags, DeclFunctionFlags.Abstract)) {
                    continue;
                }

                this.emitDeclaration(context, id, decl);
                this.emit(";");
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
                if (isBuiltin(context, decl) || Flags.has(decl.flags, DeclFunctionFlags.Abstract)) {
                    return;
                }

                const ctx = context.createChildContext(decl.children, id);

                this.emitSeparator();
                this.emitDeclaration(context, id, decl);
                this.emitNewline();

                this.emitBody(ctx, decl.children.body);
                return;
            }
                
            case Tag.DeclGenericParameter: {
                // TODO: Why is this triggered
                return;
            }
                
            case Tag.DeclStruct: {
                if (isBuiltin(context, decl) || isGeneric(decl)) {
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
                this.emitType(context, decl.type); // TODO: Keep track of parent
                this.emit(" ", decl.name);
                return;
            }
                
            case Tag.ExprDeclaration: {
                return;
            }
                
            case Tag.NodeFree: {
                return;
            }
        }

        throw unreachable(decl);
    }

    public emitExpr(context: Context, id: ExprId, expr?: Node) {
        expr = expr ?? context.get(id);

        switch (expr.tag) {
            case Tag.DeclVariable: {
                this.emitDeclaration(context, id, expr);
                if (expr.value !== null) {
                    this.emit(" = ");
                    this.emitExpr(context, expr.value);
                }
                return;
            }
                
            case Tag.ExprBody: {
                console.error("Not implemented ")
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
                throw unreachable(expr);
            }
                
            case Tag.ExprDestroy: {
                const v = context.get(expr.target);

                this.emit('/* implement destroy(', v.name,') */')
                return;
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
                        throw unreachable(targetRef);
                    }
                }
            }
                
            case Tag.ExprIf: {
                // First case
                const first = context.get(expr.cases[0]) as ExprIfCase;

                this.emit('if (');
                this.emitExpr(context, first.condition!);
                this.emit(')');
                this.emitBody(context, first.body);

                // Other cases
                for (let i = 1; i < expr.cases.length; i++) {
                    const other = context.get(expr.cases[i]) as ExprIfCase;

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
                    this.emit("return");
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
                        throw unreachable(targetRef);
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

        throw unreachable(expr);
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
            const arg = context.get(argId);

            const paramId = fn.parameters[index];
            const param = Node.as(fn.children.nodes[paramId], DeclVariable);

            switch (arg.tag) {
                case Tag.ExprConstant: {
                    this.emitExpr(context, argId, arg);
                    break;
                }

                case Tag.ExprMove:
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

    public emitDeclaration(context: Context, id: NodeId, node: Node) {
        switch (node.tag) {
            case Tag.DeclFunction: {
                context = context.createChildContext(node.children, id);

                this.emitTypeStart(context, node.returnType);
                this.emit(node.name, "(");
                this.emitDeclarations(context, node.parameters);
                this.emit(")");
                this.emitTypeEnd(context, node.returnType);
                return;
            }
                
            case Tag.DeclVariable: {
                this.emitTypeStart(context, node.type);
                this.emit(node.name);
                this.emitTypeEnd(context, node.type);
                return;
            }
        }

        throw unreachable(node);
    }

    public emitDeclarations(context: Context, ids: ReadonlyArray<NodeId>) {
        if (ids.length === 0) {
            return;
        }

        this.emitDeclaration(context, ids[0], context.get(ids[0]));

        for (let index = 1; index < ids.length; index++) {
            this.emit(", ");
            this.emitDeclaration(context, ids[index], context.get(ids[index]));
        }
    }

    public emitTypeStart(context: Context, type: Type) {
        switch (type.tag) {
            case Tag.TypeFunction: {
                this.emitTypeStart(context, type.returnType);
                this.emit('(*');
                return;
            }
                
            case Tag.TypeGenericApply: {
                // TODO: Implement generic correctly
                // We assume this is always a Ptr<T>
                this.emitTypeStart(context, type.args[0]);
                this.emit("* ");
                return;
            }
                
            case Tag.TypeGet: {
                // TODO: Implement FFI system to allow aliasing underlying target identifiers
                const decl = context.get(type.target);
                const name = convertBuiltinName(context, decl);

                if (name === null) {
                    this.emit('struct ', decl.name, ' ');
                } else {
                    this.emit(name, ' ');
                }
                return;
            }
        }

        unreachable(type);
    }

    public emitTypeEnd(context: Context, type: Type) {
        if (type.tag === Tag.TypeFunction) {
            this.emitTypeEnd(context, type.returnType);
            this.emit(')(');

            const parameters = type.parameters;
            if (parameters.length > 0) {
                this.emitTypeStart(context, parameters[0]);

                for (let index = 1; index < parameters.length; index++) {
                    this.emit(", ");
                    this.emitTypeStart(context, parameters[index]);
                }
            }

            this.emit(')');
        }
    }

    public emitType(context: Context, type: Type) {
        switch (type.tag) {
            case Tag.TypeFunction: {
                this.emit(`void(*)()`);
                return;
            }

            case Tag.TypeGenericApply: {
                // Assume it's a Ptr<T>
                this.emitType(context, type.args[0]);
                this.emit("*");
                return;
            }

            case Tag.TypeGet: {
                // TODO: Implement FFI system to allow aliasing underlying target identifiers
                const decl = context.get(type.target);
                const name = convertBuiltinName(context, decl);

                if (name === null) {
                    this.emit('struct ', decl.name);
                } else {
                    this.emit(name);
                }

                return;
            }

            case Tag.TypeInfer: {
                throw new Error(`Unreachable: '${Tag[type.tag]}' should have been handled earlier.`);
            }
        }

        throw unreachable(type);
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
            if (context.get(id).tag === Tag.DeclGenericParameter) {
                continue;
            }

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