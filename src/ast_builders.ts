import * as Ast from "./ast";
import { Compiler } from './compile';
import { canSubType } from './type_api';
import { Tag } from './post';

const IMPL_TARGET_DOES_NOT_EXIST    = "$1 does not exist, do you mean $2?";
const IMPL_TARGET_NOT_A_TRAIT       = "$0 tried to implement $1, but $1 is not a trait.";
const IMPL_TARGET_NOT_SUBTYPE       = "$0 is missing $2 required to implement $1";

// TODO: "id" fields should be unique, use some kind of name mangling scheme to guarantee this

type Node = any[];

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
        const type = scope.lookupType(impl[3].data[0].value);

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
        } else if(!canSubType(obj, type)){
            compiler.error(
                IMPL_TARGET_NOT_SUBTYPE,
                [node[1].value, impl[3].data[0].value, "<not implemented>"],
                [impl[3].data[0], type.ast]
            );
        } else {
            obj.traits.set(type.id, type);
        }
    }

    scope.declareClass(obj);
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

    const type = scope.lookupType(typeNode.data[0].value);
    if(type === undefined){
        compiler.error("$0 does not exist, did you mean $1", [typeNode.data[0].value, '???'], [typeNode.data[0]]);
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
    obj.return_type = scope.lookupType(node[3][3].data[0].value);
    if(obj.return_type === undefined){
        compiler.error("$0 does not exist, did you mean $1", [node[3][3].data[0].value, '???'], [node[3][3].data[0]]);
    }

    // Collect statements
    if(node[5] !== null){
        for(const statement of node[5][1].elements){
            const stmt = compiler.parse(statement, obj.scope);
            if(stmt !== undefined){
                obj.body.push(stmt as Ast.Expression);
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
export function Variable(node: Node, compiler: Compiler){
    throw new Error("Not implemented yet");
}

//// ExCall
export function ExCall(node: Node, compiler: Compiler, scope: Ast.Scope){
    const call = new Ast.ExCall(node, null as any);

    // TODO: Split call types into their respective categories
    //  - symbol(foo, bar)
    //  - symbol.method(foo, bar)
    //  - expression(foo, bar)
    //  - expression.method(foo, bar)

    const name = node[0].data[0];
    const func = scope.lookupFunction(name.value);
    if(func === undefined){
        compiler.error("$0 does not exist, did you mean $1", [name, "???"], [name]);
        // TODO: Support better error bail out
        return;
    }
    call.target = func;

    call.result_type = func.return_type;

    for(const argument of node[1].elements){
        const expression = compiler.parse(argument, scope) as Ast.Expression; 
        if(expression !== undefined){
            call.arguments.push(expression);
        }
    }

    return call;
}

//// ExConstruct
export function ExConstruct(node: Node, compiler: Compiler){
    throw new Error("Not implemented yet");
}

//// ExVariable
export function ExReturn(node: Node, compiler: Compiler, scope: Ast.Scope){
    return new Ast.ExReturn(node, compiler.parse(node[1][1], scope) as Ast.Expression);
}

//// ExVariable
export function ExVariable(node: Node, compiler: Compiler, scope: Ast.Scope){
    const name = node[0];
    const variable = scope.lookupVariable(name.value);
    if(variable === undefined){
        compiler.error("$0 does not exist, did you mean $1", [name, "???"], [name]);
        return;
    }

    return new Ast.ExVariable(node, variable);
}

export function LiteralInteger(node: Node, compiler: Compiler){
    return new Ast.ExConstant(node, null as any, node[0].value);
}

export function LiteralString(node: Node, compiler: Compiler){
    return new Ast.ExConstant(node, null as any, node[0].value);
}