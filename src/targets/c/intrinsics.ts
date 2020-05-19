import { Compiler } from '../../compile';
import { Class, Function, VariableFlags, Variable, Type, Expr, Tag } from '../../ast/things';
import { Scope } from '../../ast/scope';

// const intrinsics = new Module("intrinsics");
// intrinsics.createFunction("infix==", [Int, Int], Bool, (x, y) => `${x} ${y}`);

export function registerIntrinsics(compiler: Compiler){
    // Intrinsics 2.0
    function createType(
        name: string,
        ffiName: string
    ): (Type & {createFunction: typeof createFunction}){
        const type = new Class("", name, ffiName, compiler.scope);
        type.ffiData = true;

        function createFunction(
            name: string,
            parameters: Array<Variable | Type>,
            returns: Type
        ){
            const fn = new Function(null, name, name, returns, type.scope);

            for(const parameter of parameters){
                if(parameter.tag === Tag.Variable){
                    fn.parameters.push(parameter);
                } else {
                    // TODO: Set a proper name?
                    fn.parameters.push(new Variable(null, `_`, parameter, VariableFlags.None, `_`));
                }
            }

            fn.ffiData = ' ' + name.substr(5) + ' ';

            type.scope.declareFunction(fn);
            return fn;
        }

        (type as any).createFunction = (...args: any[]) => (createFunction as any)(...args, type.scope);
        compiler.scope.declareType(type);
        return type as any;
    }

    function createFunction(
        name: string,
        parameters: Array<Variable | Type>,
        returns: Type,
        ffiName = name
    ){
        const fn = new Function(null, name, name, returns, compiler.scope);

        for(const parameter of parameters){
            if(parameter.tag === Tag.Variable){
                fn.parameters.push(parameter);
            } else {
                // TODO: Set a proper name?
                fn.parameters.push(new Variable(null, `_`, parameter, VariableFlags.None, `_`));
            }
        }

        fn.ffiData = ffiName;
        fn.returnType = returns;

        compiler.scope.declareFunction(fn);
        return fn;
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////

    // TODO: Support binding to target within the language itself
    const Bool  = createType("Bool",    "bool");
    const Int   = createType("Int",     "int");
    const None  = createType("None",    "void");
    const Str   = createType("Str",     "char*");
    const Ptr   = createType("Ptr",     "void*");

    // Operators for Int
    for(const operator of ["==", "!=", "<=", ">=", "<", ">"]){
        Int.createFunction(`infix${operator}`, [Int, Int], Bool);
    }
    for(const operator of ["+", "-", "*", ">>", "<<", "&", "|", "^"]){
        Int.createFunction(`infix${operator}`, [Int, Int], Int);
    }

    // Operators for Ptr
    for(const operator of ["==", "!=", "<=", ">=", "<", ">"]){
        Ptr.createFunction(`infix${operator}`, [Ptr, Ptr], Bool);
    }

    createFunction('writeLn', [Str], None, 'printf');
    createFunction('Memory_allocate', [Int], Ptr, 'malloc');
    createFunction('Memory_free', [Ptr], None, 'free');

    const copy = createFunction('copy', [Ptr], None, undefined);
    const move = createFunction('move', [Ptr], None, undefined);

    return {
        types: {
            string: Str,
            int: Int,
            none: None,
        },
        functions: {
            copy: copy,
            move: move,
        }
    };
}

export function removeIntrinsics(compiler: Compiler){
    for(const type of Array.from(compiler.scope.typeNameMap.values())){
        if(type.tag === Tag.Class && type.ffiData){
            compiler.scope.typeNameMap.delete(type.name);
            compiler.scope.classNameMap.delete(type.name);
        }
    }

    for(const func of Array.from(compiler.scope.functionNameMap.values())){
        if(func.ffiData){
            compiler.scope.functionNameMap.delete(func.name);
            compiler.scope.typeNameMap.delete(func.name);
        }
    }
}