// Code generation step
import { Scope } from '../../ast/scope';
import { CallField, CallStatic, Class, Constant, Construct, Expr, Function, GetField, GetVariable, If, Return, SetField, SetVariable, Stmt, Tag, Variable, While, VariableFlags } from '../../ast/things';

export class TargetCGcc {
    public output = ["#include <stdio.h>\n#include <stdlib.h>\n"];

    public constructor(){
    }

    public compileModule(scope: Scope){
        Array.from(scope.classNameMap.values()).sort((a, b) => a.id.localeCompare(b.id)).forEach(thing => this.declareClass(thing));
        Array.from(scope.functionNameMap.values()).sort((a, b) => a.id.localeCompare(b.id)).forEach(thing => this.declareFunction(thing));
        this.output.push("\n");

        Array.from(scope.classNameMap.values()).sort((a, b) => a.id.localeCompare(b.id)).forEach(thing => this.compileClass(thing));
        Array.from(scope.functionNameMap.values()).sort((a, b) => a.id.localeCompare(b.id)).forEach(thing => this.compileFunction(thing));
    }

    public declareClass(thing: Class) {
        // Declare structure
        this.output.push(thing.id, "{");
        if(thing.members.size > 0){
            this.output.push("\n");
        }
        for(const member of thing.members.values()){
            if(member.tag === Tag.Variable){
                this.declareClassField(member);
            }
        }
        this.output.push("};\n");

        // Declare methods
        for(const member of thing.members.values()){
            if(member.tag === Tag.Function){
                this.declareFunction(member);
            }
        }
        this.output.push("\n");
    }

    public declareClassField(member: Variable) {
        this.output.push('    ', member.type.id, " ", member.id, ';\n');
    }

    public declareFunction(thing: Function) {
        const output = this.output;
        if(thing.name !== "main"){
            output.push("static ");
        }
        output.push(thing.returnType.id, " ", thing.id)

        // Parameters
        output.push("(");
        const parameters = thing.parameters;
        for(let i = 0; i < parameters.length; i++){
            if(i > 0){
                output.push(", ");
            }

            const parameter = parameters[i];
            output.push(parameter.type.id);     // Parameter type

            // TODO remove indirection for types that only have immutable operations (integers)
            if(parameter.flags & VariableFlags.Mutates){
                output.push("* restrict");
            }

            output.push(" ");
            output.push(parameter.id);
        }
        output.push(");\n");
    }

    public compileFunction(thing: Function){
        const output = this.output;

        if(thing.name !== "main"){
            output.push("static ");
        }
        output.push(thing.returnType.id, " ", thing.id)

        // Parameters
        output.push("(");
        const parameters = thing.parameters;
        for(let i = 0; i < parameters.length; i++){
            if(i > 0){
                output.push(", ");
            }

            const parameter = parameters[i];
            output.push(parameter.type.id);     // Parameter type

            if(parameter.flags & VariableFlags.Mutates){
                output.push("* restrict");
            }

            output.push(" ");
            output.push(parameter.id);
        }
        output.push("){");
        if(thing.body.block.length > 0){
            output.push("\n");
        }

        // Body
        for(const expression of thing.body.block){
            output.push("\t");
            this.compileStmt(expression);
            output.push(";\n");
        }
        output.push("}\n");
    }

    public compileExpr(thing: Expr) {
        switch(thing.tag){
            case Tag.CallField:   this.compileCall(thing); break;
            case Tag.CallStatic:  this.compileCall(thing); break;
            case Tag.Constant:    this.compileConstant(thing); break;
            case Tag.Construct:   this.compileConstruct(thing); break;
            case Tag.GetField:    this.compileGetField(thing); break;
            case Tag.GetVariable: this.compileGetVariable(thing); break;
            default: throw new Error("Incomplete switch statement (compileExpr)")
        }
    }

    public compileStmt(thing: Stmt){
        switch(thing.tag){
            case Tag.CallField:   this.compileCall(thing); break;
            case Tag.CallStatic:  this.compileCall(thing); break;
            case Tag.Return:      this.compileReturn(thing); break;
            case Tag.SetField:    this.compileSetField(thing); break;
            case Tag.SetVariable: this.compileSetVariable(thing); break;
            case Tag.Variable:    this.compileVariable(thing); break;
            case Tag.If:          this.compileIf(thing); break;
            case Tag.While:       this.compileWhile(thing); break;
            default: throw new Error("Incomplete switch statement (compileStmt)")
        }
    }

    public compileIf(thing: If) {
        const output = this.output;

        for(const c of thing.cases){
            output.push("if(");
            this.compileExpr(c.condition);
            output.push("){\n");

            for(const stmt of c.body.block){
                this.compileStmt(stmt);
                output.push(";\n");
            }

            output.push("}");
        }

        if(thing.defaultCase.block.length !== 0){
            output.push(" else {\n");
            for(const stmt of thing.defaultCase.block){
                this.compileStmt(stmt);
                output.push(";\n");
            }
            output.push("}");
        }
    }

    public compileWhile(thing: While){
        const output = this.output;

        output.push("while(");
        this.compileExpr(thing.condition);
        output.push("){")

        for(const stmt of thing.body.block){
            this.compileStmt(stmt);
            output.push(";\n");
        }

        output.push("}");
    }

    public compileSetField(thing: SetField) {
        this.compileExpr(thing.target);

        if(thing.target.tag === Tag.GetVariable && (thing.target.variable.flags & VariableFlags.Mutates)){
            this.output.push("->", thing.field.id, " = ");
        } else {
            this.output.push(".", thing.field.id, " = ");
        }

        this.compileExpr(thing.source);
    }

    public compileSetVariable(thing: SetVariable) {
        this.output.push(thing.target.id);
        this.output.push(" = ");
        this.compileExpr(thing.source);
    }

    public compileClass(thing: Class) {
        // Member Functions
        for(const member of thing.members.values()){
            switch(member.tag){
                case Tag.Function: this.compileFunction(member); break;
                case Tag.Variable: break; // Handled in previous section
                default: throw new Error("Incomplete switch statement (compileMember)")
            }
        }
    }

    public compileVariable(thing: Variable) {
        this.output.push(thing.type.id, " ", thing.id);
        if(thing.value !== undefined){
            this.output.push(" = ");
            this.compileExpr(thing.value);
        }
    }

    public compileReturn(expression: Return) {
        this.output.push("return ");
        this.compileExpr(expression.value);
    }

    public compileGetVariable(node: GetVariable) {
        const output = this.output;

        output.push(node.variable.id);
    }

    public compileGetField(node: GetField) {
        const output = this.output;

        this.compileExpr(node.target);
        if(node.target.tag === Tag.GetVariable && (node.target.variable.flags & VariableFlags.Mutates)){
            this.output.push("->", node.field.id);
        } else {
            this.output.push(".", node.field.id);
        }
    }

    public compileCall(node: CallStatic | CallField){
        const output = this.output;

        // TODO: Create a better way of representing various calls to operators
        if(node.target.name.startsWith("infix")){
            this.compileExpr(node.arguments[0]);
            output.push(node.target.ffiData);
            this.compileExpr(node.arguments[1]);
            return;
        }

        // Function name
        if(node.target.ffiData !== undefined){
            output.push(node.target.ffiData);
        } else {
            output.push(node.target.id);
        }

        // Function arguments
        output.push("(");
        const args = node.arguments;
        for(let i = 0; i < args.length; i++){
            if(i > 0){
                output.push(", ");
            }

            const arg = args[i];
            if(arg.tag === Tag.GetVariable){
                if(arg.variable.flags & VariableFlags.Mutates){
                    if(node.target.parameters[i].flags & VariableFlags.Mutates){
                        output.push(arg.variable.id);
                    } else {
                        output.push("*", arg.variable.id);
                    }
                } else {
                    if(node.target.parameters[i].flags & VariableFlags.Mutates){
                        output.push("&", arg.variable.id);
                    } else {
                        output.push(arg.variable.id);
                    }
                }
            } else {
                this.compileExpr(arg);
            }
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

        for(let i = 0; i < node.arguments.length; i++){
            if(i > 0){
                this.output.push(",");
            }
            this.compileExpr(node.arguments[i]);
        }

        this.output.push("}");
    }
}

export default TargetCGcc;