import * as Ast from "./ast";
import { Compiler } from './compile';
import { Tag } from './post';
import { canMonomorphize, canSubType } from './type_api';

const IMPL_TARGET_DOES_NOT_EXIST    = "$1 does not exist, do you mean $2?";
const IMPL_TARGET_NOT_A_TRAIT       = "$0 tried to implement $1, but $1 is not a trait.";
const IMPL_TARGET_NOT_SUBTYPE       = "$0 is missing $2 required to implement $1";

// TODO: "id" fields should be unique, use some kind of name mangling scheme to guarantee this

type Node = any[];

function lookupType(node: any, compiler: Compiler, scope: Ast.Scope){
    const name = node[0].value;
    const type = scope.lookupType(name);

    if(type === undefined){
        compiler.error("$0 does not exist, did you mean $1", [name, '???'], [node.data[0]]);
    }

    // TODO: Support type members

    return type;
}

function lookupClass(node: any, compiler: Compiler, scope: Ast.Scope){
    const thing = scope.lookupClass(node.data[0].value);
    return thing;
}

//// Class
export function Class(node: Node, compiler: Compiler, scope: Ast.Scope){
    const name = node[1].text;
    const obj = new Ast.Class(node, name, name, scope);

    // Collect members
    if(node[4] !== null){
        for(const member of node[4][1].elements){
            const parsed = compiler.parse(member, obj.scope) as Ast.Member;
            obj.members.set(parsed.id, parsed);
        }
    }

    // Collect implemented traits
    for(const impl of node[2]){
        const type = lookupType(impl[3], compiler, scope);

        // TODO: Create better error handling system
        if(type === undefined){
            compiler.error(
                IMPL_TARGET_DOES_NOT_EXIST,
                [node[1].value, impl[3].data[0].value],
                [impl[3].data[0]]
            );
        } else if(type.tag !== Ast.Tag.Trait){
            compiler.error(
                IMPL_TARGET_NOT_A_TRAIT,
                [node[1].value, impl[3].data[0].value],
                [impl[3].data[0], type.ast]
            );
        } else {
            obj.traits.set(type.id, type);
        }
    }

    scope.declareClass(obj);
    obj.id = "struct " + obj.id;

    return obj;
}

function Parameter(node: any, compiler: Compiler, scope: Ast.Scope) {
    // TODO: Find a better way of failing the current compilation unit

    let typeNode: any;
    let name: string;

    if(node.tag === Tag.PARAMETER_TYPE){
        // [Keyword, Type]
        name = "";
        typeNode = node.data[1];
    } else {
        // [Keyword, Name, _, _, _, Type]
        name = node.data[1].value;
        typeNode = node.data[5];
    }

    const type = lookupType(typeNode, compiler, scope);
    if(type === undefined){
        return
    }

    return new Ast.Variable(node, name, type, name);
}

//// Function
export function Function(node: Node, compiler: Compiler, scope: Ast.Scope){
    const name = node[1][0].text;
    const obj = new Ast.Function(node, name, name, scope);

    // Collect parameters
    for(const parameterNode of node[2].elements){
        const parameter = Parameter(parameterNode, compiler, obj.scope);
        if(parameter !== undefined){
            obj.parameters.push(parameter);
            
            // TODO: Better support here
            if(parameter.name){
                obj.scope.declareVariable(parameter);
            }
        }
    }

    // Return type
    if(node[3] === null){
        compiler.error("All functions must declare return types", [], [node[1][0]]);
        return;
    }
    obj.returnType = lookupType(node[3][3], compiler, scope);

    // Collect statements
    if(node[5] !== null){
        for(const statement of node[5][1].elements){
            const stmt = compiler.parse(statement, obj.scope);
            if(stmt !== undefined){
                obj.body.push(stmt as Ast.Stmt);
            }
        }
    }

    scope.declareFunction(obj);

    return obj;
}

//// Trait
export function Trait(node: Node, compiler: Compiler, scope: Ast.Scope){
    const name = node[1].text;

    const obj = new Ast.Trait(node, name, name, scope);

    // Collect members
    if(node[4] !== null){
        for(const member of node[4][1].elements){
            const parsed = compiler.parse(member, obj.scope) as Ast.Member;
            obj.members.set(parsed.id, parsed);
        }
    }

    // Collect traits
    if(node[2].length !== 0){
        compiler.error("Traits can not implement other traits", [], [node[1]]);
        return;
    }

    scope.declareTrait(obj);

    return obj;
}

//// Variable
export function Variable(node: Node, compiler: Compiler, scope: Ast.Scope){
    const type = lookupType(node[2][3], compiler, scope);

    if(type === undefined){
        // TODO: Poisoning
        return undefined;
    }

    const thing = new Ast.Variable(node, node[1].value, type, node[1].value);
    scope.declareVariable(thing);

    return thing;
}

//// ExCall
export function ExCallHelper(node: Node, compiler: Compiler, scope: Ast.Scope){
    switch(node[0].name){
        case 'ExVariable': {
            const thing = scope.lookupFunction(node[0].data[0].value);

            if(thing === undefined){
                // TODO: Suggest symbol
                compiler.error("$0 does not exist, did you mean $1", [node[0].data[0].value, '???'], [node[0].data[0]]);
            }

            return new Ast.Call(node, thing!);
        }

        case 'ExprIndexDot': {
            const expression = compiler.parse(node[0].data[0], scope) as Ast.Expr;

            switch(expression.resultType?.tag){
                case Ast.Tag.Class:
                case Ast.Tag.Trait:
                    // Okay
                    break;

                default:
                    throw new Error("Not implemented yet");
            }

            const thing = expression.resultType.scope.lookupFunction(node[0].data[2].value);
            
            if(thing === undefined){
                // TODO: Suggest symbol
                compiler.error("$0 does not exist, did you mean $1", [node[0].data[2].value, '???'], [node[0].data[2]]);
            }

            const call = new Ast.Call(node, thing!);
            (call as any).expression = expression;
            return call;
        }
        default: throw new Error("Incomplete switch"); break;
    }
}

export function ExCall(node: Node, compiler: Compiler, scope: Ast.Scope){
    // TODO: Split call types into their respective categories
    //  - symbol(foo, bar)
    //  - symbol.method(foo, bar)
    //  - expression(foo, bar)
    //  - expression.method(foo, bar)

    let call = ExCallHelper(node, compiler, scope);

    const args = node[1].elements.map((arg: any) => compiler.parse(arg, scope));
    call.arguments = args;


    // TODO: Type check parameters and arguments
    if(call.target !== undefined){
        const blame = node[0].data[0];

        if(call.arguments.length > call.target.parameters.length){
            compiler.error("Too many arguments", [], [blame]);
        } else if(call.arguments.length < call.target.parameters.length){
            compiler.error("Too few arguments", [], [blame]);
        }
    }

    return call;
}

export function ExprIndexDot(node: Node, compiler: Compiler, scope: Ast.Scope){
    const expression = compiler.parse(node[0], scope) as Ast.Expr;

    switch(expression.resultType?.tag){
        case Ast.Tag.Class:
        case Ast.Tag.Trait:
            // Okay
            break;

        default:
            throw new Error("Not implemented yet");
    }

    const field = expression.resultType.scope.lookupVariable(node[2].value);

    return new Ast.GetField(node, expression, field!);
}

//// ExConstruct
export function ExConstruct(node: Node, compiler: Compiler, scope: Ast.Scope){
    const target = lookupClass(node[0], compiler, scope);

    const thing = new Ast.Construct(node, target!);

    return thing;
}

// ExOpInfix
export function ExOpInfix(node: Node, compiler: Compiler, scope: Ast.Scope){
    const func = scope.lookupFunction("$infix+");

    if(func === undefined){
        compiler.error("Could not find operator", [], [node[2][0][0]]);
        return;
    }

    const call = new Ast.Call(node, func);

    call.arguments.push(compiler.parse(node[0], scope) as Ast.Expr);
    call.arguments.push(compiler.parse(node[4], scope) as Ast.Expr);

    return call;
}

// ExOpInfix
export function ExOpPostfix(node: Node, compiler: Compiler){
    throw new Error("Not implemented yet");
}

// ExOpInfix
export function ExOpPrefix(node: Node, compiler: Compiler){
    throw new Error("Not implemented yet");
}

//// ExReturn
export function ExReturn(node: Node, compiler: Compiler, scope: Ast.Scope){
    const expression = compiler.parse(node[1][1], scope) as Ast.Expr;
    if(expression === undefined){
        return;
    }

    return new Ast.Return(node, expression);
}

//// ExVariable
export function ExVariable(node: Node, compiler: Compiler, scope: Ast.Scope){
    const name = node[0];
    const variable = scope.lookupVariable(name.value);
    if(variable === undefined){
        compiler.error("$0 does not exist, did you mean $1", [name, "???"], [name]);
        return;
    }

    return new Ast.GetVariable(node, variable);
}

export function LiteralInteger(node: Node, compiler: Compiler){
    return new Ast.Constant(node, null as any, node[0].value);
}

export function LiteralString(node: Node, compiler: Compiler){
    return new Ast.Constant(node, null as any, node[0].value);
}

export function StmtAssign(node: Node, compiler: Compiler, scope: Ast.Scope){
    // TODO: Generate AST nodes based on what we assign to
    // TODO: Support assignment operators
    // TODO: StmtAssign target should have tag

    if(node[0].name !== "ExprIndexDot"){
        const assignable = scope.lookupVariable(node[0].value);
        const value = compiler.parse(node[2], scope) as Ast.Expr;

        return new Ast.SetVariable(node, assignable!, value);
    } else {
        const expression = compiler.parse(node[0].data[0], scope) as Ast.Expr;

        if(expression.resultType?.tag !== Ast.Tag.Class){
            throw new Error("Not implemented yet");
        }

        const variable = expression.resultType.scope.lookupVariable(node[0].data[2].value)
        const value = compiler.parse(node[2], scope) as Ast.Expr;

        if(variable === undefined){
            compiler.error("$0 does not exist, do you mean $1", [node[0].data[2].value, '???'], [node[0].data[2]]);
        }

        return new Ast.SetField(node, expression, variable!, value);
    }
}