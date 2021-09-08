import { Flags } from '../common/flags';
import { Node, Tag, Type, Variable, Function, VariableFlags, ExprCallStatic } from '../nodes';

export class TargetC {
    private output = new Array<string>();
    public emit(...text: string[]) {
        this.output.push(...text);
    }

    private indent = [''];
    private indentCurrent = '';
    private context!: Function;

    public emitProgram(nodes: Node[]) {
        // TODO: Forward declare

        for (const node of nodes) {
            this.emitNode(node);
        }
    }

    public emitNode(node: Node) {
        switch (node.tag) {
            case Tag.Class:
            case Tag.Trait:
                console.warn(`targetC>emitNode>${Tag[node.tag]} not implemented`)
                return;

            case Tag.Function: {
                // C doesn't support nested functions, `transformUnnest` guarantees no nested functions.
                //  So we can keep track of the current function with a single variable.
                this.context = node;

                this.emitSeparator ();
                this.emitTypeName  (node.returnType);
                this.emit          (" ", node.name, "(");
                this.emitParameters(node.parameters);
                this.emit          (")");
                this.emitBody      (node.body);
                return;
            }

            case Tag.Variable: {
                this.emitTypeName(node.type);
                this.emit        (" ", node.name);

                if (node.value !== null) {
                    this.emit    (" = ");
                    this.emitNode(node.value);
                }
                return;
            }

            case Tag.ExprCallStatic: {
                this.emit         ((node.target as Function).name, "(");
                this.emitArguments(node);
                this.emit         (")");
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
                this.emitNode(node.value);
                return;
            }

            case Tag.StmtDelete: {
                this.emit("DELETE");
                return;
            }

            case Tag.StmtIf: {
                this.emit    ("if (");
                this.emitNode(node.branches[0].condition);
                this.emit    (")");
                this.emitBody(node.branches[0].body);
                // TODO: Support else if / else
                return;
            }
        }

        throw new Error(`targetC>emitNode>${Tag[node.tag]}: Not implemented.`);
    }

    public emitTypeName(type: Type) {
        switch (type.tag) {
            case Tag.Class:     this.emit(type.name); return;
            case Tag.Function:  this.emit(type.name); return;
            case Tag.Trait:     this.emit(type.name); return;
            case Tag.TypeInfer: this.emit("INFER");   return;
            default:            throw new Error(`targetC>emitTypeName>${Tag[type.tag]}: Not implemented.`);
        }
    }

    public emitArguments(call: ExprCallStatic) {
        const args = call.args;
        const target = call.target as Function;

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
                    const parameterIsPtr = Flags.has(target.parameters[index].flags, VariableFlags.Mutates);

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
                    throw new Error(`targetC>emitArguments>${Tag[arg.tag]}: Not implemented.`);
                }
            }
        }
    }

    public emitParameters(parameters: Variable[]) {
        for (let index = 0; index < parameters.length; index++) {
            if (index > 0) {
                this.emit(", ");
            }

            const parameter = parameters[index];

            this.emitTypeName(parameter.type);

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

    public emitBody(nodes: Node[]) {
        this.pushIndent();
        this.emit("{");
        for (const child of nodes) {
            this.emitNewline();
            this.emitNode   (child);
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
