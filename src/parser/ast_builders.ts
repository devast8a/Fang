import * as Ast from "../ast/things";
import { VariableFlags } from '../ast/things';
import { Compiler } from '../compile';
import { Tag } from './post_processor';
import { canMonomorphize, canSubType } from '../type_api';
import { MissingIdentifierError, NotTraitError, TraitImplementingTraitError, CompilerError } from '../errors';
import { Scope } from '../ast/scope';

const IMPL_TARGET_DOES_NOT_EXIST    = "$1 does not exist, do you mean $2?";
const IMPL_TARGET_NOT_A_TRAIT       = "$0 tried to implement $1, but $1 is not a trait.";
const IMPL_TARGET_NOT_SUBTYPE       = "$0 is missing $2 required to implement $1";

// TODO: "id" fields should be unique, use some kind of name mangling scheme to guarantee this

type Node = any[];

function lookupType(node: any, compiler: Compiler, scope: Scope){
    const identifier = node[0];
    const type = scope.lookupType(identifier.value);

    if(type === undefined){
        compiler.report(new MissingIdentifierError(identifier, scope));
    }

    // TODO: Support type members

    return type;
}

function lookupClass(node: any, compiler: Compiler, scope: Scope){
    const thing = scope.lookupClass(node.data[0].value);
    return thing;
}

//// Class
export function Class(node: Node, compiler: Compiler, scope: Scope){
    const name = node[1].text;
    const obj = new Ast.Class(node, name, scope.id + name, scope);
    scope.declareClass(obj);

    // Collect members
    if(node[4] !== null){
        for(const member of node[4][1].elements){
            const parsed = compiler.parse<Ast.Member>(member, obj.scope);

            if(parsed === null){
                return null;
            }

            obj.members.set(parsed.name, parsed);
        }
    }

    // Collect implemented traits
    for(const impl of node[2]){
        const type = lookupType(impl[3], compiler, scope);

        if(type === undefined){
            compiler.report(new MissingIdentifierError(impl[3].data[0], scope));
        } else if(type.tag !== Ast.Tag.Trait){
            compiler.report(new NotTraitError(impl[3].data[0]));
        } else {
            obj.traits.set(type.name, type);
        }
    }

    obj.id = "struct " + obj.id;

    return obj;
}

export function Operator(node: any, compiler: Compiler, scope: Scope){
    return Function(node, compiler, scope);
}

function Parameter(node: any, compiler: Compiler, scope: Scope) {
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

    let flags = VariableFlags.None;

    for(const tag of node.data[0]){
        // TODO: Move this into the parser post-processors
        switch(tag[0].value){
            case "mut": flags |= VariableFlags.Mutates; break;
            case "own": flags |= VariableFlags.Owns; break;
        }
    }

    const type = lookupType(typeNode, compiler, scope);
    if(type === undefined){
        return
    }

    return new Ast.Variable(node, name, type, flags, name);
}

//// Function
export function Function(node: Node, compiler: Compiler, scope: Scope){
    const name = node[1][0].text;

    // TODO: Support developer explicitly naming a symbol
    let id = name;
    if(scope.id != "F" || name != "main"){
        id = scope.id + name;
    }

    // Return type
    const returnType = node[3] === null ? compiler.types.none : lookupType(node[3][3], compiler, scope);

    if(returnType === undefined){
        compiler.report(new MissingIdentifierError(node[3][3], scope));
        return null;
    }

    const obj = new Ast.Function(node, name, id, returnType, scope);

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

    // Collect statements
    if(node[5] !== null){
        for(const statement of node[5][1].elements){
            const stmt = compiler.parse<Ast.Stmt>(statement, obj.scope);

            if(stmt !== undefined && stmt !== null){
                obj.body.block.push(stmt);
            }
        }
    }

    scope.declareFunction(obj);

    return obj;
}

//// Trait
export function Trait(node: Node, compiler: Compiler, scope: Scope){
    const name = node[1].text;

    const obj = new Ast.Trait(node, name, scope.id + name, scope);

    // Collect members
    if(node[4] !== null){
        for(const member of node[4][1].elements){
            const parsed = compiler.parse<Ast.Member>(member, obj.scope);

            if(parsed === null){
                return null;
            }

            obj.members.set(parsed.name, parsed);
        }
    }

    // Collect traits
    if(node[2].length !== 0){
        compiler.report(new TraitImplementingTraitError(node[1]));
    }

    scope.declareTrait(obj);

    return obj;
}

//// Variable
export function Variable(node: Node, compiler: Compiler, scope: Scope){
    const type = lookupType(node[2][3], compiler, scope);

    if(type === undefined){
        return null;
    }

    // HACK: We currently set Variable as local. This is -NOT- true generally.
    // TODO: We need to detect and handle locals differently
    const thing = new Ast.Variable(node, node[1].value, type, VariableFlags.Local, node[1].value);

    if(node[3] !== null){
        const value = compiler.parse<Ast.Expr>(node[3][4], scope);

        if(value === null){
            return null;
        }

        thing.value = value;
    }

    scope.declareVariable(thing);
    return thing;
}

//// ExCall
export function ExCallHelper(node: Node, compiler: Compiler, scope: Scope){
    switch(node[0].name){
        case 'ExVariable': {
            const thing = scope.lookupFunction(node[0].data[0].value);

            if(thing === undefined){
                compiler.report(new MissingIdentifierError(node[0].data[0], scope));
                return null;
            }

            return new Ast.CallStatic(node, thing);
        }

        case 'ExprIndexDot': {
            const expression = compiler.parse<Ast.Expr>(node[0].data[0], scope);
            
            if(expression === null){
                return null;
            }

            switch(expression.expressionResultType?.tag){
                case Ast.Tag.Class:
                case Ast.Tag.Trait:
                    // Okay
                    break;

                default:
                    throw new Error("Not implemented yet");
            }

            const thing = expression.expressionResultType.scope.lookupFunction(node[0].data[2].value);
            
            if(thing === undefined){
                // TODO: Suggest symbol
                compiler.report(new MissingIdentifierError(node[0].data[2], scope));
                return null;
            }

            const call = new Ast.CallField(node, expression, thing);
            return call;
        }

        default: throw new Error(`Incomplete switch (ExCallHelper) (${node[0].name})`); break;
    }
}

export function ExCall(node: Node, compiler: Compiler, scope: Scope){
    // TODO: Split call types into their respective categories
    //  - symbol(foo, bar)
    //  - symbol.method(foo, bar)
    //  - expression(foo, bar)
    //  - expression.method(foo, bar)

    const call = ExCallHelper(node, compiler, scope);

    // TODO: Needs some TLC
    if(call === null){
        return null;
    }

    const args = new Array<Ast.Expr>();
    for(const argNode of node[1].elements){
        const arg = compiler.parse<Ast.Expr>(argNode, scope);

        if(arg == null){
            return null;
        }

        args.push(arg);
    }
    call.arguments = args;

    return call;
}

export function ExprIndexDot(node: Node, compiler: Compiler, scope: Scope){
    const expression = compiler.parse<Ast.Expr>(node[0], scope);

    if(expression === null){
        return null;
    }

    switch(expression.expressionResultType?.tag){
        case Ast.Tag.Class:
        case Ast.Tag.Trait:
            // Okay
            break;

        default:
            throw new Error("Not implemented yet");
    }

    const field = expression.expressionResultType.scope.lookupVariable(node[2].value);

    if(field === undefined){
        return null;
    }

    return new Ast.GetField(node, expression, field);
}

//// ExConstruct
export function ExConstruct(node: Node, compiler: Compiler, scope: Scope){
    const target = lookupClass(node[0], compiler, scope);

    if(target === undefined){
        return null;
    }

    const thing = new Ast.Construct(node, target);

    for(const argument of node[1].elements){
        const arg = compiler.parse<Ast.Expr>(argument, scope)

        if(arg === null){
            return null;
        }

        thing.arguments.push(arg);
    }

    return thing;
}

// ExOpInfix
export function ExOpInfix(node: Node, compiler: Compiler, scope: Scope){
    const left = compiler.parse<Ast.Expr>(node[0], scope);
    const right = compiler.parse<Ast.Expr>(node[4], scope);
    
    if(left === null || right === null){
        return null;
    }

    let name = "infix";
    for(let i = 0; i < node[2].length; i++){
        name += node[2][i][0].value;
    }

    const func = left.expressionResultType.scope.lookupFunction(name);
    if(func === undefined){
        compiler.report(new MissingIdentifierError(node[2][0][0], scope));
        return null;
    }

    const call = new Ast.CallStatic(node, func);
    call.arguments.push(left);
    call.arguments.push(right);

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
export function ExReturn(node: Node, compiler: Compiler, scope: Scope){
    const expression = compiler.parse<Ast.Expr>(node[1][1], scope);

    if(expression === null){
        return null;
    }

    return new Ast.Return(node, expression);
}

//// ExVariable
export function ExVariable(node: Node, compiler: Compiler, scope: Scope){
    const name = node[0];

    const variable = scope.lookupVariable(name.value);
    if(variable !== undefined){
        return new Ast.GetVariable(node, variable);
    }

    const type = scope.lookupType(name.value);
    if(type !== undefined){
        return new Ast.GetType(node, type);
    }

    compiler.report(new MissingIdentifierError(name, scope));
    return null;
}

export function LiteralInteger(node: Node, compiler: Compiler){
    return new Ast.Constant(
        node,
        compiler.types.int,
        node[0].value
    );
}

export function LiteralString(node: Node, compiler: Compiler){
    return new Ast.Constant(
        node,
        compiler.types.string,
        node[0].value
    );
}

export function StmtAssign(node: Node, compiler: Compiler, scope: Scope){
    // TODO: Generate AST nodes based on what we assign to
    // TODO: Support assignment operators
    // TODO: StmtAssign target should have tag

    if(node[0].name !== "ExprIndexDot"){
        const assignable = scope.lookupVariable(node[0].value);
        const value = compiler.parse<Ast.Expr>(node[2], scope);

        if(assignable === undefined || value === null){
            return null;
        }

        return new Ast.SetVariable(node, assignable, value);
    } else {
        const expression = compiler.parse<Ast.Expr>(node[0].data[0], scope);

        if(expression === null){
            return null;
        }

        if(expression.expressionResultType?.tag !== Ast.Tag.Class){
            throw new Error("Not implemented yet");
        }

        const variable = expression.expressionResultType.scope.lookupVariable(node[0].data[2].value)
        const value = compiler.parse<Ast.Expr>(node[2], scope);

        if(variable === undefined){
            compiler.report(new MissingIdentifierError(node[0].data[2], scope));
            return;
        }

        if(value === null){
            return null;
        }

        return new Ast.SetField(node, expression, variable, value);
    }
}

// keyword condition body elif:* else:?
export function If(node: Node, compiler: Compiler, scope: Scope){
    const condition = compiler.parse<Ast.Expr>(node[1][2], scope);

    if(condition === null){
        return null;
    }

    // First condition and body
    const body = [];
    for(const stmt of node[2].elements){
        // TODO: Needs some TLC
        const s = compiler.parse<Ast.Stmt>(stmt, scope)
        if(s === null){
            return null;
        }
        body.push(s);
    }
    const cases = [new Ast.Case(condition, new Ast.Block(body))];

    // TODO: Support other cases

    // Else branch
    const otherwise = [];
    if(node[4] !== null){
        for(const stmt of node[4][3].elements){
            const s = compiler.parse<Ast.Stmt>(stmt, scope)
            if(s === null){
                return null;
            }
            otherwise.push(s);
        }
    }

    return new Ast.If(node, cases, new Ast.Block(otherwise));
}

// keyword condition body
export function While(node: Node, compiler: Compiler, scope: Scope){
    const condition = compiler.parse<Ast.Expr>(node[1][2], scope);
    
    if(condition === null){
        return null;
    }

    // First condition and body
    const body = [];
    for(const stmt of node[2].elements){
        const s = compiler.parse<Ast.Stmt>(stmt, scope)
        if(s === null){
            return null;
        }
        body.push(s);
    }

    return new Ast.While(condition, new Ast.Block(body));
}