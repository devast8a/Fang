// Code generation step
import { Tag, Class, Function, ExCall, Expression, ExConstant, ExVariable, ExReturn, ExConstruct, Variable, StmtAssignVariable, StmtAssignField, ExprIndexDot } from './ast';

export class TargetCGcc {
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
            // TODO: Create separate Stmt nodes and move these there
            case Tag.Variable as any: return this.compileVariable(expression as any);
            case Tag.ExprIndexDot as any: return this.compileExprIndexDot(expression as any);
            case Tag.StmtAssignVariable as any: return this.compileStmtAssignVariable(expression as any);
            case Tag.StmtAssignField as any: return this.compileStmtAssignField(expression as any);

            case Tag.ExCall: return this.compileExCall(expression);
            case Tag.ExConstant: return this.compileExConstant(expression);
            case Tag.ExConstruct: return this.compileExConstruct(expression);
            case Tag.ExVariable: return this.compileExVariable(expression);
            case Tag.ExReturn: return this.compileExReturn(expression);
            default: throw new Error("Incomplete switch statement (compileExpression)")
        }
    }

    public compileStmtAssignField(thing: StmtAssignField) {
        this.compileExpression(thing.target);
        this.output.push(".", thing.field.name, "=");
        this.compileExpression(thing.source);
    }

    public compileStmtAssignVariable(thing: StmtAssignVariable) {
        this.output.push(thing.target.id);
        this.output.push("=");
        this.compileExpression(thing.source);
    }

    public compileClass(thing: Class) {
        this.output.push(thing.id, "{");

        for(const member of thing.members.values()){
            this.compileExpression(member as any);
            this.output.push(";");
        }

        this.output.push("};");
    }

    public compileVariable(thing: Variable) {
        this.output.push(thing.type.id, " ", thing.name);
    }

    public compileExReturn(expression: ExReturn) {
        this.output.push("return ");
        this.compileExpression(expression.value);
    }

    public compileExVariable(node: ExVariable) {
        const output = this.output;

        output.push(node.variable.id);
    }

    public compileExprIndexDot(node: ExprIndexDot) {
        const output = this.output;

        this.compileExpression(node.target);
        output.push(".", node.field.name);
    }

    public compileExCall(node: ExCall){
        const output = this.output;

        if(node.target.id[0] === '$'){
            // TODO: Create a better way of representing various calls to operators
            const operator = node.target.id.replace("$infix", "");
            this.compileExpression(node.arguments[0]);
            output.push(operator);
            this.compileExpression(node.arguments[1]);
            return;
        }

        // TODO: Extend to non-function calls
        if((node as any).target.ffi_name !== undefined){
            output.push((node as any).target.ffi_name);
        } else {
            output.push(node.target.id);
        }
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

    public compileExConstruct(node: ExConstruct) {
        this.output.push("{");
        this.output.push("}");
    }
}

export default TargetCGcc;