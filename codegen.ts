// Code generation step
import { Tag, Class, Function, ExCall, Expression, ExConstant, ExVariable } from './ast';

export class target_c_gcc {
    public output = ["#include <stdio.h>\n"];

    public compileFunction(node: Function){
        const output = this.output;
        output.push(node.return_type!.id, " ", node.id)

        // Parameters
        output.push("(");
        const parameters = node.parameters;
        for(let i = 0; i < parameters.length; i++){
            if(i > 0){
                output.push(", ");
            }

            const parameter = parameters[i];
            output.push(parameter.type.id);     // Parameter type
            output.push(" ");
            output.push(parameter.id);
        }
        output.push("){");

        // Body
        for(const expression of node.body){
            this.compileExpression(expression);
            output.push(";");
        }
        output.push("}");
    }

    public compileExpression(expression: Expression) {
        switch(expression.tag){
            case Tag.ExCall: return this.compileExCall(expression as ExCall);
            case Tag.ExConstant: return this.compileExConstant(expression as ExConstant);
            case Tag.ExVariable: return this.compileExVariable(expression as ExVariable);
            default: throw new Error("Incomplete switch statement (compileExpression)")
        }
    }

    public compileExVariable(node: ExVariable) {
        const output = this.output;

        output.push(node.variable.id);
    }

    public compileExCall(node: ExCall){
        const output = this.output;

        // TODO: Extend to non-function calls
        output.push(node.target.id)
        output.push("(");

        const args = node.arguments;
        for(let i = 0; i < args.length; i++){
            if(i > 0){
                output.push(", ");
            }

            this.compileExpression(args[i]);
        }

        output.push(")")
    }

    public compileExConstant(node: ExConstant) {
        // TODO: Determine which type of constant it is
        // For now assume we can just output the value
        this.output.push(node.value);
    }
}

export default target_c_gcc;