// Code generation step
import { Call, Class, Constant, Construct, Expr, Function, GetField, GetVariable, Member, Return, SetField, SetVariable, Stmt, Tag, Variable } from './ast';

export class TargetCGcc {
    public output = ["#include <stdio.h>\n"];

    public declareFunction(thing: Function) {
        const output = this.output;
        output.push(thing.returnType!.id, " ", thing.id)

        // Parameters
        output.push("(");
        const parameters = thing.parameters;
        for(let i = 0; i < parameters.length; i++){
            if(i > 0){
                output.push(", ");
            }

            const parameter = parameters[i];
            output.push(parameter.type.id);     // Parameter type
            output.push(" ");
            output.push(parameter.id);
        }
        output.push(");\n")
    }

    public compileFunction(thing: Function){
        const output = this.output;
        output.push(thing.returnType!.id, " ", thing.id)

        // Parameters
        output.push("(");
        const parameters = thing.parameters;
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
        if(thing.body.length > 0){
            output.push("\n");
        }

        // Body
        for(const expression of thing.body){
            output.push("\t");
            this.compileStmt(expression);
            output.push(";\n");
        }
        output.push("}\n");
    }

    public compileExpression(thing: Expr) {
        switch(thing.tag){
            case Tag.Call:        this.compileCall(thing); break;
            case Tag.Constant:    this.compileConstant(thing); break;
            case Tag.Construct:   this.compileConstruct(thing); break;
            case Tag.GetField:    this.compileGetField(thing); break;
            case Tag.GetVariable: this.compileGetVariable(thing); break;
            default: throw new Error("Incomplete switch statement (compileExpr)")
        }
    }

    public compileStmt(thing: Stmt){
        switch(thing.tag){
            case Tag.Call:        this.compileCall(thing); break;
            case Tag.Return:      this.compileReturn(thing); break;
            case Tag.SetField:    this.compileSetField(thing); break;
            case Tag.SetVariable: this.compileSetVariable(thing); break;
            case Tag.Variable:    this.compileVariable(thing); break;
            default: throw new Error("Incomplete switch statement (compileStmt)")
        }
    }

    public compileMemberFunction(name: string, thing: Function) {
        const output = this.output;
        output.push(thing.returnType!.id, " ", thing.id)

        // Parameters
        output.push("(");
        const parameters = thing.parameters;
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
        if(thing.body.length > 0){
            output.push("\n");
        }

        // Body
        for(const expression of thing.body){
            output.push("\t");
            this.compileStmt(expression);
            output.push(";\n");
        }
        output.push("}\n");
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
        // Data structure
        this.output.push(thing.id, "{");
        if(thing.members.size > 0){
            this.output.push("\n");
        }
        for(const member of thing.members.values()){
            switch(member.tag){
                case Tag.Function: break; // Handled in next section
                case Tag.Variable: this.compileVariable(member); this.output.push(";\n"); break;
                default: throw new Error("Incomplete switch statement (compileMember)")
            }
        }
        this.output.push("};\n");

        // Member Functions
        for(const member of thing.members.values()){
            switch(member.tag){
                case Tag.Function: this.compileMemberFunction(thing.name, member); break;
                case Tag.Variable: break; // Handled in previous section
                default: throw new Error("Incomplete switch statement (compileMember)")
            }
        }
    }

    public compileVariable(thing: Variable) {
        this.output.push(thing.type.id, " ", thing.id);
        if(thing.value !== undefined){
            this.output.push(" = ");
            this.compileExpression(thing.value);
        }
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