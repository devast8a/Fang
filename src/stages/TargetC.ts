import { RGenericParameter } from '../nodes/resolved/RGenericParameter';
import { RNode, RNodes } from '../nodes/resolved/RNode';
import { RTag } from '../nodes/resolved/RTag';

export class TargetC {
    public constructor() {
    }

    public output = new Array<string>();

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
                this.output.push((node.returnType as RNodes.TypeAtom).value);
                this.output.push(" ");
                this.output.push((node.name));
                this.output.push("(");

                // Parameters
                for (let index = 0; index < node.parameters.length; index++) {
                    if (index > 0) {
                        this.output.push(", ");
                    }

                    const parameter = node.parameters[index];

                    this.output.push((parameter.type as RNodes.TypeAtom).value);
                    this.output.push(" ");
                    this.output.push(parameter.name);
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
                this.output.push((node.type as RNodes.TypeAtom).value);
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

                    this.emit(node.args[index], "");
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