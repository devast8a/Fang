import * as Ast from "./ast";
import { Compiler } from './compile';
import { canSubType } from './type_api';

const IMPL_TARGET_DOES_NOT_EXIST    = "$1 does not exist, do you mean $2?";
const IMPL_TARGET_NOT_A_TRAIT       = "$0 tried to implement $1, but $1 is not a trait.";
const IMPL_TARGET_NOT_SUBTYPE       = "$0 is missing $2 required to implement $1";

// TODO: "id" fields should be unique, use some kind of name mangling scheme to guarantee this

type Node = any[];

//// Class
export function Class(node: Node, compiler: Compiler){
    const obj = new Ast.Class();

    obj.ast = node;
    obj.name = node[1].text;
    obj.id = obj.name;
    obj.members = new Map;

    // Collect members
    if(node[4] !== null){
        for(const member of node[4][1].elements){
            const parsed = compiler.parse(member) as Ast.Member;
            obj.members.set(parsed.id, parsed);
        }
    }

    // Collect implemented traits
    for(const impl of node[2]){
        const type = compiler.get_type(impl[3]);

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

//// Function
export function Function(node: Node, compiler: Compiler){
    const obj = new Ast.Function();

    obj.ast = node;
    obj.name = node[1][0].text;
    obj.id = obj.name;

    // Collect parameters
    const parameters = [];
    for(const parameter of node[2].elements){
        // TODO: Redo parameter collection
    }
    obj.parameters = parameters;

    // Collect statements
    const statements = [];
    if(node[4] !== null){
        for(const statement of node[4][1].elements){
            //console.log(state.parse(statement));
        }
    }

    //compiler.types.set(obj.id, obj);
    return obj;
}

//// Trait
export function Trait(node: Node, compiler: Compiler){
    const obj = new Ast.Trait();

    obj.ast = node;
    obj.name = node[1].text;
    obj.id = obj.name;
    obj.members = new Map;

    // Collect members
    if(node[4] !== null){
        for(const member of node[4][1].elements){
            const parsed = compiler.parse(member) as Ast.Member;
            obj.members.set(parsed.id, parsed)
        }
    }

    // Collect traits
    if(node[2].length !== 0){
        throw new Error("Traits can not yet implement traits")
    }

    compiler.types.set(obj.id, obj);
    return obj;
}

//// Variable
export function Variable(node: Node, compiler: Compiler){
    return new Ast.Variable();
}

//// ExCall
export function ExCall(node: Node, compiler: Compiler){
    return new Ast.ExCall();
}

//// ExConstruct
export function ExConstruct(node: Node, compiler: Compiler){
    return new Ast.ExConstruct();
}