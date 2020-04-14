// Code generation step
import { Call, Class, Constant, Construct, Expr, Function, GetField, GetVariable, Member, Return, SetField, SetVariable, Stmt, Tag, Variable } from './ast';

export class TargetCGcc {
    public output = ["#include <stdio.h>\n"];

    public compileFunction(node: Function){
        const output = this.output;
        output.push(node.returnType!.id, " ", node.id)

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
            this.compileStmt(expression);
            output.push(";");
        }
        output.push("}");
    }

    public compileExpression(thing: Expr) {
        switch(thing.tag){
            case Tag.Call:          return this.compileCall(thing);
            case Tag.Constant:      return this.compileConstant(thing);
            case Tag.Construct:     return this.compileConstruct(thing);
            case Tag.GetField:      return this.compileGetField(thing);
            case Tag.GetVariable:   return this.compileGetVariable(thing);
            default: throw new Error("Incomplete switch statement (compileExpr)")
        }
    }

    public compileStmt(thing: Stmt){
        switch(thing.tag){
            case Tag.Call:              return this.compileCall(thing);
            case Tag.Return:            return this.compileReturn(thing);
            case Tag.SetField:          return this.compileSetField(thing);
            case Tag.SetVariable:       return this.compileSetVariable(thing);
            case Tag.Variable:          return this.compileVariable(thing);
            default: throw new Error("Incomplete switch statement (compileStmt)")
        }
    }

    public compileMember(thing: Member){
        switch(thing.tag){
            case Tag.Variable:              return this.compileVariable(thing);
            default: throw new Error("Incomplete switch statement (compileMember)")
        }
    }

    public compileSetField(thing: SetField) {
        this.compileExpression(thing.target);
        this.output.push(".", thing.field.name, "=");
        this.compileExpression(thing.source);
    }

    public compileSetVariable(thing: SetVariable) {
        this.output.push(thing.target.id);
        this.output.push("=");
        this.compileExpression(thing.source);
    }

    public compileClass(thing: Class) {
        this.output.push(thing.id, "{");

        for(const member of thing.members.values()){
            this.compileMember(member);
            this.output.push(";");
        }

        this.output.push("};");
    }

    public compileVariable(thing: Variable) {
        this.output.push(thing.type.id, " ", thing.name);
    }

    public compileReturn(expression: Return) {
        this.output.push("return ");
        this.compileExpression(expression.value);
    }

    public compileGetVariable(node: GetVariable) {
        const output = this.output;

        output.push(node.variable.id);
    }

    public compileGetField(node: GetField) {
        const output = this.output;

        this.compileExpression(node.target);
        output.push(".", node.field.name);
    }

    public compileCall(node: Call){
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

    public compileConstant(node: Constant) {
        // TODO: Determine which type of constant it is
        // For now assume we can just output the value
        this.output.push(node.value);
    }

    public compileConstruct(node: Construct) {
        this.output.push("{");
        this.output.push("}");
    }
}

export default TargetCGcc;