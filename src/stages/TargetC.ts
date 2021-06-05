import { Register, Visitor } from '../ast/visitor';
import { builtin } from '../Builtin';
import { RDeclVariable, VariableFlags } from '../nodes/resolved/RDeclVariable';
import { RNode, RNodes } from '../nodes/resolved/RNode';
import { RTag } from '../nodes/resolved/RTag';
import { RType } from '../nodes/resolved/RType';

function setup(reg: Register<TargetC, RNode, [string], void>) {
    reg(RNodes.DeclClass, (node, output, indent) => {
        output.emitStr("\n\n", indent, "struct ", node.name);
        output.emitBody(node.members, indent);
    });

    reg(RNodes.DeclFunction, (node, output, indent) => {
        output.emitStr("\n\n", indent);
        output.emitTypeName(node.returnType);
        output.emitStr(" ", node.name, "(");
        emitParameters(node.parameters, output);
        output.emitStr(") ");
        output.emitBody(node.body, indent);
    });

    reg(RNodes.DeclTrait, (node, output, indent) => {
    });

    reg(RNodes.DeclVariable, (node, output, indent) => {
        output.emitTypeName(node.type);
        output.emitStr(" ", node.name);
    });

    reg(RNodes.ExprCallStatic, (node, output, indent) => {
        output.emitStr(node.target.name, "(");
        emitArguments(node.target, node.args, output);
        output.emitStr(")");
    });

    reg(RNodes.ExprConstant, (node, output, indent) => {
        switch (node.type) {
            case builtin.types.str: {
                // TODO: Escape output
                output.emitStr("\"");
                output.emitStr(node.value);
                output.emitStr("\"");
                break;
            }

            default: {
                output.emitStr(node.value);
            }
        }
    });

    reg(RNodes.ExprSetLocal, (node, output, indent) => {
        output.emitStr(node.local.name, " = ");
        output.emit(node.value, indent);
    });

    reg(RNodes.ExprGetLocal, (node, output, indent) => {
        output.emitStr(node.local.name);
    });

    reg(RNodes.StmtIf, (node, output, indent) => {
        // Main if case
        output.emitStr("if (");
        output.emit(node.cases[0].condition, indent);
        output.emitStr(') ');
        output.emitBody(node.cases[0].body, indent);

        // Else if cases
        for (let i = 1; i < node.cases.length; i++) {
            output.emitStr(' else if (')
            output.emit(node.cases[i].condition, indent);
            output.emitStr(') ');
            output.emitBody(node.cases[i].body, indent);
        }

        // Else case
        if (node.final.length > 0) {
            output.emitStr(' else ');
            output.emitBody(node.final, indent);
        }
    });
}

function emitArguments(target: RNodes.DeclFunction, args: RNode[], output: TargetC) {
    for (let index = 0; index < args.length; index++) {
        if (index > 0) {
            output.emitStr(", ");
        }

        const arg = args[index];

        switch (arg.tag) {
            case RTag.ExprConstant: {
                output.emit(arg, "");
                break;
            }

            case RTag.ExprGetLocal: {
                if (arg.local.flags & VariableFlags.Mutates) {
                    if (target.parameters[index].flags & VariableFlags.Mutates) {
                        output.emitStr(arg.local.name);
                    } else {
                        output.emitStr("*");
                        output.emitStr(arg.local.name);
                    }
                } else {
                    if (target.parameters[index].flags & VariableFlags.Mutates) {
                        output.emitStr("&");
                        output.emitStr(arg.local.name);
                    } else {
                        output.emitStr(arg.local.name);
                    }
                }
                break;
            }

            default: {
                throw new Error("Incomplete switch");
            }
        }
    }
}

function emitParameters(parameters: RDeclVariable[], output: TargetC) {
    // Parameters
    for (let index = 0; index < parameters.length; index++) {
        if (index > 0) {
            output.emitStr(", ");
        }

        const parameter = parameters[index];
        output.output.push((parameter.type as RNodes.TypeAtom).name);
        if ((parameter.flags & VariableFlags.Mutates) > 0) {
            output.output.push("* restrict");
        }
        output.output.push(" ");
        output.output.push(parameter.name);
    }
}

export class TargetC extends Visitor<RNode, [string], void> {
    public constructor() {
        super(RTag, setup);
    }

    public output = new Array<string>();

    public emit = super.visit;

    public emitStr(...text: string[]) {
        this.output.push(...text);
    }

    public emitBody(nodes: RNode[], indent: string) {
        if (nodes.length === 0) {
            this.emitStr("{}");
            return;
        }

        const childIndent = indent + "    ";

        this.emitStr("{\n");
        for (const child of nodes) {
            this.emitStr(childIndent);
            this.emit(child, childIndent);
            this.emitStr(";\n");
        }
        this.emitStr(indent);
        this.emitStr("}");
    }

    public emitTypeName(type: RType) {
        // TODO: Properly do this
        this.output.push((type as RNodes.TypeAtom).name);
    }
}