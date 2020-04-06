import * as Ast from "./ast";
import { State } from './compile';

// TODO: "id" fields should be unique, use some kind of name mangling scheme to guarantee this

type Node = any[];

//// Class
export function Class(node: Node, state: State){
    const obj = new Ast.Class();

    // obj.ast = node.data;
    obj.name = node[1].text;
    obj.id = obj.name;
    obj.members = new Map;

    // Collect members
    if(node[3] !== null){
        for(const member of node[3][1].elements){
            const parsed = state.parse(member) as Ast.Member;
            obj.members.set(parsed.id, parsed);
        }
    }

    // Collect implemented traits
    for(const impl of node[2]){
        const type = state.get_type(impl[3]);

        if(type === undefined || type.tag !== Ast.Tag.Trait){
            // TODO: Create better error handling system
            throw new Error("Types can only impl trait")
        }

        //console.log(T.couldImplement(obj, type));

        obj.traits.set(type.id, type);
    }

    state.types.set(obj.id, obj);
    return obj;
}

//// Function
export function Function(node: Node, state: State){
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

    state.types.set(obj.id, obj);
    return obj;
}

//// Trait
export function Trait(node: Node, state: State){
    const obj = new Ast.Trait();

    //obj.ast = node.data;
    obj.name = node[1].text;
    obj.id = obj.name;
    obj.members = new Map;

    // Collect members
    if(node[3] !== null){
        for(const member of node[3][1].elements){
            const parsed = state.parse(member) as Ast.Member;
            obj.members.set(parsed.id, parsed)
        }
    }

    // Collect traits
    if(node[2].length !== 0){
        throw new Error("Traits can not yet implement traits")
    }

    state.types.set(obj.id, obj);
    return obj;
}

//// Variable
export function Variable(node: Node){
    return new Ast.Variable();
}

//// ExCall
export function ExCall(node: Node){
    return new Ast.ExCall();
}

//// ExConstruct
export function ExConstruct(node: Node){
    return new Ast.ExConstruct();
}