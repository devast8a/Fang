import { RDeclVariable } from '../nodes/resolved/RDeclVariable';
import { RNode, RNodes } from '../nodes/resolved/RNode';
import { RTag } from '../nodes/resolved/RTag';
import { VariableFlags } from '../nodes/VariableFlags';

export class TargetC {
    public constructor() {
    }

    public output = new Array<string>();

    protected emitParameter(variable: RDeclVariable) {
        this.output.push((variable.type as RNodes.TypeAtom).name);
        if ((variable.flags & VariableFlags.Mutates) > 0) {
            this.output.push("* restrict");
        }
        this.output.push(" ");
        this.output.push(variable.name);
    }

    protected emitArgument(variable: RDeclVariable) {
    }

    public emit(node: RNode, indent = "") {
        switch (node.tag) {
            case RTag.DeclClass: {
                this.output.push("\n\n");
                this.output.push(indent);
                this.output.push("struct ");
                this.output.push(node.name);
                this.output.push(" {\n");
                this.output.push("}");
                break;
            }

            case RTag.DeclFunction: {
                this.output.push("\n\n");
                this.output.push(indent);
                this.output.push((node.returnType as RNodes.TypeAtom).name);
                this.output.push(" ");
                this.output.push((node.name));
                this.output.push("(");

                // Parameters
                for (let index = 0; index < node.parameters.length; index++) {
                    if (index > 0) {
                        this.output.push(", ");
                    }

                    this.emitParameter(node.parameters[index]);
                }

                this.output.push(indent);
                this.output.push(") {\n");

                const childIndent = indent + "    ";
                for (const child of node.body) {
                    this.output.push(childIndent);
                    this.emit(child, childIndent);
                    this.output.push(";\n");
                }

                this.output.push(indent);
                this.output.push("}");

                break;
            }

            case RTag.DeclTrait: {
                break;
            }

            case RTag.DeclVariable: {
                this.output.push((node.type as RNodes.TypeAtom).name);
                this.output.push(" ");
                this.output.push(node.name);
                break;
            }

            case RTag.ExprCallStatic: {
                this.output.push(node.target.name);
                this.output.push("(");

                // Arguments
                for (let index = 0; index < node.args.length; index++) {
                    if (index > 0) {
                        this.output.push(", ");
                    }

                    const arg = node.args[index];
                    switch (arg.tag) {
                        case RTag.ExprGetLocal: {
                            if (arg.local.flags & VariableFlags.Mutates) {
                                if (node.target.parameters[index].flags & VariableFlags.Mutates) {
                                    this.output.push(arg.local.name);
                                } else {
                                    this.output.push("*");
                                    this.output.push(arg.local.name);
                                }
                            } else {
                                if (node.target.parameters[index].flags & VariableFlags.Mutates) {
                                    this.output.push("&");
                                    this.output.push(arg.local.name);
                                } else {
                                    this.output.push(arg.local.name);
                                }
                            }
                            break;
                        }

                        default: this.emit(arg, "");
                    }
                }

                this.output.push(")");
                break;
            }

            case RTag.ExprGetLocal: {
                this.output.push(node.local.name);
                break;
            }

            default: {
                throw new Error(`TargetC does not handle node with tag ${RTag[(node as any).tag]}`);
            }
        }
    }
}