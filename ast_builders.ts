import * as Ast from "./ast";
import { Compiler } from './compile';
import { canSubType } from './type_api';

// TODO: "id" fields should be unique, use some kind of name mangling scheme to guarantee this

type Node = any[];

//// Class
export function Class(node: Node, compiler: Compiler){
    const obj = new Ast.Class();

    // obj.ast = node.data;
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
            throw new Error("Type does not exist");
        }
        if(type.tag !== Ast.Tag.Trait){
            throw new Error("Types can only impl trait");
        }
        if(!canSubType(obj, type)){
            throw new Error("Can not subtype trait");
        }

        obj.traits.set(type.id, type);
    }

    compiler.types.set(obj.id, obj);
    return obj;
}

//// Function
export function Function(node: Node, compiler: Compiler){
    const obj = new Ast.Function();

    // obj.ast = node.data;
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

    compiler.types.set(obj.id, obj);
    return obj;
}

//// Trait
export function Trait(node: Node, compiler: Compiler){
    const obj = new Ast.Trait();

    //obj.ast = node.data;
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