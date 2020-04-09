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
export function Class(node: Node, compiler: Compiler){
    const name = node[1].text;
    const obj = new Ast.Class(node, name, name);

    // Collect members
    if(node[4] !== null){
        for(const member of node[4][1].elements){
            const parsed = compiler.parse(member) as Ast.Member;
            obj.members.set(parsed.id, parsed);
        }
    }

    // Collect implemented traits
    for(const impl of node[2]){
        const type = compiler.lookup_type(impl[3]);

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

    compiler.types.set(obj.id, obj);
    return obj;
}

function Parameter(node: any, compiler: Compiler){
    let type: Ast.Type | undefined;
    let name: string;

    if(node.tag === Tag.PARAMETER_TYPE){
        // [Keyword, Type]
        name = "";
        type = compiler.lookup_type(node.data[1]);
    } else {
        // [Keyword, Name, _, _, _, Type]
        name = node.data[1].value;
        type = compiler.lookup_type(node.data[5]);
    }

    if(type === undefined){
        throw new Error("Not implemented");
    }

    return new Ast.Variable(node, name, type, name);
}

//// Function
export function Function(node: Node, compiler: Compiler){
    const name = node[1][0].text;
    const obj = new Ast.Function(node, name, name);

    // Collect parameters
    for(const parameterNode of node[2].elements){
        obj.parameters.push(Parameter(parameterNode, compiler));
    }

    // Return type
    if(node[3] === null){
        throw new Error("You must supply return types for now, sorry");
    }
    obj.return_type = compiler.lookup_type(node[3][3]);

    // Collect statements
    if(node[5] !== null){
        for(const statement of node[5][1].elements){
            obj.body.push(compiler.parse(statement) as Ast.Expression);
        }
    }

    // TODO: Support scoping
    compiler.types.set(obj.id, obj);
    compiler.functions.set(obj.id, obj);

    return obj;
}

//// Trait
export function Trait(node: Node, compiler: Compiler){
    const name = node[1].text;

    const obj = new Ast.Trait(node, name, name);

    // Collect members
    if(node[4] !== null){
        for(const member of node[4][1].elements){
            const parsed = compiler.parse(member) as Ast.Member;
            obj.members.set(parsed.id, parsed)
        }
    }

    // Collect traits
    if(node[2].length !== 0){
        throw new Error("Not implemented yet"); // TODO: Implement error
    }

    compiler.types.set(obj.id, obj);

    return obj;
}

//// Variable
export function Variable(node: Node, compiler: Compiler){
    throw new Error("Not implemented yet");
}

//// ExCall
export function ExCall(node: Node, compiler: Compiler){
    const call = new Ast.ExCall(node, null as any);

    const func = compiler.lookup_function(node[0]);
    if(func === undefined){
        throw new Error("Not implemented yet"); // TODO: Implement error
    }
    call.target = func;

    call.result_type = func.return_type;

    for(const argument of node[1].elements){
        call.arguments.push(compiler.parse(argument) as Ast.Expression);
    }

    return call;
}

//// ExConstruct
export function ExConstruct(node: Node, compiler: Compiler){
    throw new Error("Not implemented yet");
}

export function LiteralString(node: Node, compiler: Compiler){
    return new Ast.ExConstant(node, null as any, node[0].value);
}