import { Scope } from './ast/scope';
import { CallField, CallStatic, Class, Constant, Construct, Function, GetField, GetType, GetVariable, Return, SetField, Tag, Trait, Type, Variable, If, Block, While, Expr, SetVariable, Thing } from './ast/things';
import { InputType, Register, Visitor } from './ast/visitor';
import { Compiler } from './compile';
import { RType } from './nodes/resolved/RType';

const REMOVE_THIS: any = undefined;

export class Polymorpher extends Visitor<Thing, State, InputType> {
    mapping: Map<Variable, Type>;
    scope: Scope;
    returnType: Type | null = null;
    compiler: Compiler;

    public constructor(compiler: Compiler, scope: Scope, mapping?: Map<Variable, Type>) {
        super(setup, Visitor.ErrorByDefault());

        if (mapping === undefined) {
            this.mapping = new Map();
        } else {
            this.mapping = mapping;
        }

        this.compiler = compiler;
        this.scope = scope;
    }

    public polymorph = super.visit;
}

export module Polymorpher {
    export class State {
        public nodes = new Array<Thing>();
    }
}

type State = Polymorpher.State;
const State = Polymorpher.State;

export default Polymorpher;

function instantiateWithArgs(input: Function, args: Expr[], polymorpher: Polymorpher, state: State) {
    let name = input.name;
    const params  = input.parameters;

    const mapping = new Map<Variable, Type>();

    // Should we abstract this out too?
    for (let i = 0; i < args.length; i++) {
        const argument = args[i];
        const parameter = params[i];

        if (parameter.type.tag === Tag.DeclTrait) {
            mapping.set(parameter, argument.expressionResultType);
            name += `_${i}_${argument.expressionResultType.name}`
        }
    }

    for (let i = 0; i < args.length; i++) {
        const argument = args[i];
        const parameter = params[i];

        if (parameter.type.tag === Tag.DeclTrait) {
            mapping.set(parameter, argument.expressionResultType);
            name += `_${i}_${argument.expressionResultType.name}`
        }
    }

    // No instantiation needs to take place
    if (mapping.size === 0) {
        return input;
    }

    // TODO: Replace with a clearer way of instantiating generics
    polymorpher.scope.functionNameMap.delete(input.name);

    const lookup = polymorpher.scope.functionNameMap.get(name);
    if (lookup !== undefined) {
        return lookup;
    }

    const inner = new Polymorpher(polymorpher.compiler, polymorpher.scope, mapping);
    const monomorphized = inner.polymorph(input, state);
    monomorphized.name = name;
    //monomorphized.id = name;
    polymorpher.scope.declareFunction(monomorphized);
    return monomorphized;
}

////////////////////////////////////////////////////////////////////////////////////////////////////
function setup(reg: Register<Polymorpher, State, InputType>) {

reg(Trait, (input, polymorpher, state) => {
    return input;
});

reg(Function, (input, polymorpher, state) => {
    const inner = new Polymorpher(polymorpher.compiler, polymorpher.scope, polymorpher.mapping);

    let returnType      = input.returnType;
    const parameters    = input.parameters.map(x => inner.polymorph(x, state));
    const body          = inner.polymorph(input.body, state);

    //const body          = input.body.map(x => inner.polymorph(x, state));


    if (input.returnType.tag === Tag.DeclTrait) {
        if (inner.returnType === null) {
            throw new Error("[Internal Error] Polymorph.Function return type is null")
        }

        returnType = inner.returnType;
        (input as any).realReturnType = returnType;
    }

    const output = new Function(REMOVE_THIS, input.name, REMOVE_THIS, returnType, REMOVE_THIS);
    output.parameters = parameters;
    output.body       = body;
    return output;
});

reg(Block, (input, polymorpher, state) => {
    return new Block(input.block.map(x => polymorpher.polymorph(x, state)));
});

reg(Class, (input, polymorpher, state) => {
    // TODO: Implement Class
    return input;
});

reg(CallStatic, (input, polymorpher, state) => {
    if (input.target === polymorpher.compiler.functions.copy) {
        return polymorpher.polymorph(input.arguments[0], state) as any;
    }
    if (input.target === polymorpher.compiler.functions.move) {
        return polymorpher.polymorph(input.arguments[0], state) as any;
    }

    const args   = input.arguments.map(x => polymorpher.polymorph(x, state));
    const target = instantiateWithArgs(input.target, args, polymorpher, state);

    const output     = new CallStatic(REMOVE_THIS, target);
    output.arguments = args;

    // Handle return type polymorphism
    if (input.target.returnType.tag === Tag.DeclTrait) {
        output.expressionResultType = (input.target as any).realReturnType;
    }

    return output;
});

reg(CallField, (input, polymorpher, state) => {
    const expr   = polymorpher.polymorph(input.expression, state);
    const args   = input.arguments.map(x => polymorpher.polymorph(x, state));
    //let target   = expr.expressionResultType.scope.lookupFunction(input.target.name);
    let target = RType.getMember(expr.expressionResultType, input.target.name);

    if (target === null) {
        throw new Error(`[Internal Error] Polymorph.CallField could not find '${input.target.name}'`);
    }

    // TODO: Perform this in its own lowering step
    // Handle self/this parameters
    if (expr.tag !== Tag.GetType) {
        args.unshift(expr);
    }

    target = instantiateWithArgs(input.target, args, polymorpher, state);

    const output = new CallField(REMOVE_THIS, expr, target);
    output.arguments = args;

    // Handle return type polymorphism
    if (input.target.returnType.tag === Tag.DeclTrait) {
        output.expressionResultType = (input.target as any).realReturnType;
    }

    return output;
});

reg(GetType, (input, polymorpher, state) => {
    return input;
})


reg(Constant, (input, polymorpher, state) => {
    return input;
});

reg(Variable, (input, polymorpher, state) => {
    const type = polymorpher.mapping.get(input);

    if (type === undefined && input.value === undefined) {
        return input;
    }

    const output = new Variable(
        REMOVE_THIS,
        input.name,
        type || input.type,
        input.flags,
        REMOVE_THIS,
    );

    if (input.value !== undefined) {
        // TODO: Change variable type
        output.value = polymorpher.polymorph(input.value, state);

        if (output.value.expressionResultType !== input.value.expressionResultType) {
            // We need to change the type of this variable
            output.type = output.value.expressionResultType;

            polymorpher.mapping.set(input, output.value.expressionResultType);
        }
    }

    return output;
});

//reg(GetField, (input, polymorpher, state) => {
//    const target = polymorpher.polymorph(input.target, state);
//    const field = RType.getMember(target.expressionResultType, input.field.name);
//
//    //const field = target.expressionResultType.scope.lookupVariable(input.field.name);
//
//    if (field === null) {
//        throw new Error(`[Internal Error] Polymorph.GetField could not find '${input.field.name}'`);
//    }
//
//    return new GetField(REMOVE_THIS, target, field);
//});
//
//reg(SetField, (input, polymorpher, state) => {
//    const target = polymorpher.polymorph(input.target, state);
//    const source = polymorpher.polymorph(input.source, state);
//    const field  = target.expressionResultType.scope.lookupVariable(input.field.name);
//
//    if (field === undefined) {
//        throw new Error(`[Internal Error] Polymorph.SetField could not find '${input.field.name}'`);
//    }
//
//    return new SetField(REMOVE_THIS, target, field, source);
//});

reg(SetVariable, (input, polymorpher, state) => {
    return new SetVariable(
        REMOVE_THIS,
        polymorpher.polymorph(input.target, state),
        polymorpher.polymorph(input.source, state)
    );
});

reg(GetVariable, (input, polymorpher, state) => {
    return new GetVariable(REMOVE_THIS, polymorpher.polymorph(input.variable, state));
});

reg(Return, (input, polymorpher, state) => {
    const value = polymorpher.polymorph(input.value, state);

    if (polymorpher.returnType === null) {
        polymorpher.returnType = value.expressionResultType;
    } else if (polymorpher.returnType === undefined) {
        console.log("X");
    }

    return new Return(REMOVE_THIS, value);
});

reg(Construct, (input, polymorpher, state) => {
    // TODO: Implement Construct
    return input;
});

reg(If, (input, polymorpher, state) => {
    return input;
});

reg(While, (input, polymorpher, state) => {
    return input;
});

////////////////////////////////////////////////////////////////////////////////////////////////////
}