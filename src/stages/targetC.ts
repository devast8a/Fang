import { Flags } from '../common/flags';
import { Node, Tag, Type, DeclVariable, DeclFunction, VariableFlags, FunctionFlags, Context } from '../nodes';

export class TargetC {
    private output = new Array<string>();
    public emit(...text: string[]) {
        this.output.push(...text);
    }

    private indent = [''];
    private indentCurrent = '';
    private context!: DeclFunction;

    public emitProgram(context: Context, nodes: Node[]) {
        // TODO: Forward declare

        for (const node of nodes) {
            this.emitNode(context, node);
        }
    }

    public emitNode(context: Context, node: Node) {
        switch (node.tag) {
            case Tag.DeclStruct:
            case Tag.DeclTrait:
                console.warn(`targetC>emitNode>${Tag[node.tag]} not implemented`)
                return;

            case Tag.DeclFunction: {
                // Don't emit abstract functions as they should never participate in code execution anyway. They should
                // always be instantiated in `transformInstantiate` into a concrete function.
                if (Flags.has(node.flags, FunctionFlags.Abstract)) {
                    return;
                }

                // C doesn't support nested functions, `transformUnnest` guarantees no nested functions.
                //  So we can keep track of the current function with a single variable.
                this.context = node;

                this.emitSeparator ();
                this.emitTypeName  (context, node.returnType);
                this.emit          (" ", node.name, "(");
                this.emitParameters(context, node.parameters);
                this.emit          (")");
                this.emitBody      (context, node.body);
                return;
            }

            case Tag.DeclVariable: {
                this.emitTypeName(context, node.type);
                this.emit        (" ", node.name);

                if (node.value !== null) {
                    this.emit    (" = ");
                    this.emitNode(context, node.value);
                }
                return;
            }

            case Tag.ExprCallField: {
                // this.emit         (node.field.name, "(");
                // this.emitArguments(node.field.parameters, node.args);
                // this.emit         (")");
                return;
            }

            case Tag.ExprCallStatic: {
                // this.emit         ((node.target as DeclFunction).name, "(");
                // this.emitArguments((node.target as DeclFunction).parameters, node.args);
                // this.emit         (")");
                return;
            }

            case Tag.ExprConstant: {
                // TODO: Encode strings correctly
                this.emit(node.value);
                return;
            }

            case Tag.ExprConstruct: {
                this.emit("CONSTRUCT");
                return;
            }

            case Tag.ExprSetLocal: {
                this.emit    (this.context.variables[node.local as number].name, " = ");
                this.emitNode(context, node.value);
                return;
            }

            case Tag.ExprDestroyLocal: {
                this.emit("DELETE");
                return;
            }

            case Tag.ExprIf: {
                this.emit    ("if (");
                this.emitNode(context, node.branches[0].condition);
                this.emit    (")");
                this.emitBody(context, node.branches[0].body);
                // TODO: Support else if / else
                return;
            }
        }

        throw new Error(`targetC>emitNode>${Tag[node.tag]}: Not implemented.`);
    }

    public emitTypeName(context: Context, type: Type) {
        switch (type.tag) {
            case Tag.TypeRefDecl:   this.emit(type.declaration.name); return;
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

    public emitBody(context: Context, nodes: Node[]) {
        this.pushIndent();
        this.emit("{");
        for (const child of nodes) {
            this.emitNewline();
            this.emitNode   (context, child);
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
