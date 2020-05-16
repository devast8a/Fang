import { Scope } from './ast/scope';
import { CallField, CallStatic, Class, Constant, Construct, Function, GetField, GetType, GetVariable, Return, SetField, Tag, Trait, Type, Variable, If, Block, While } from './ast/things';
import { InputType, Register, Visitor } from './ast/visitor';
import { Compiler } from './compile';

export class Polymorpher extends Visitor<State, InputType> {
    mapping: Map<Variable, Type>;
    scope: Scope;
    returnType: Type | null = null;
    compiler: Compiler;

    public constructor(compiler: Compiler, scope: Scope, mapping?: Map<Variable, Type>){
        super(setup, Visitor.ErrorByDefault());

        if(mapping === undefined){
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

    }
}

type State = Polymorpher.State;
const State = Polymorpher.State;

export default Polymorpher;

////////////////////////////////////////////////////////////////////////////////////////////////////
function setup(reg: Register<Polymorpher, State, InputType>){

reg(Trait, (input, polymorpher, state) => {
    return input;
});

reg(Function, (input, polymorpher, state) => {
    let inner = new Polymorpher(polymorpher.compiler, polymorpher.scope, polymorpher.mapping);

    let returnType      = input.returnType;
    const parameters    = input.parameters.map(x => inner.polymorph(x, state));
    const body          = inner.polymorph(input.body, state);

    //const body          = input.body.map(x => inner.polymorph(x, state));


    if(input.returnType!.tag === Tag.Trait){
        returnType = inner.returnType!;
        (input as any).realReturnType = returnType;
    }

    // TODO: Should we replace scope with a duplicate?
    const output = new Function(input.ast, input.name, input.id, input.scope);
    output.returnType = returnType;
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
    if(input.target === polymorpher.compiler.functions.copy){
        return polymorpher.polymorph(input.arguments[0], state) as any;
    }
    if(input.target === polymorpher.compiler.functions.move){
        return polymorpher.polymorph(input.arguments[0], state) as any;
    }

    const args    = input.arguments.map(x => polymorpher.polymorph(x, state));
    const params  = input.target.parameters;
    const mapping = new Map<Variable, Type>();

    let name = input.target.name;

    for(let i = 0; i < args.length; i++){
        const argument = args[i];
        const parameter = params[i];

        if(parameter.type.tag === Tag.Trait){
            mapping.set(parameter, argument.expressionResultType!);
            name += `_${i}_${argument.expressionResultType!.name}`
        }
    }

    let target = input.target;

    if(mapping.size > 0){
        // TODO: Replace with a clearer way of instantiating generics
        polymorpher.scope.functionNameMap.delete(input.target.name);

        let monomorphized = polymorpher.scope.functionNameMap.get(name);
        if(monomorphized === undefined){
            const inner = new Polymorpher(polymorpher.compiler, polymorpher.scope, mapping);
            monomorphized = inner.polymorph(input.target, state);
            monomorphized.name = name;
            monomorphized.id = name;
            polymorpher.scope.declareFunction(monomorphized);
        }

        target = monomorphized;
    }

    const output     = new CallStatic(input.ast, target);
    output.arguments = args;

    // Handle return type polymorphism
    if(input.target.returnType!.tag === Tag.Trait){
        output.expressionResultType = (input.target as any).realReturnType;
    }

    return output;
});

reg(GetType, (input, polymorpher, state) => {
    return input;
})

reg(CallField, (input, polymorpher, state) => {
    const expr   = polymorpher.polymorph(input.expression, state);
    const args   = input.arguments.map(x => polymorpher.polymorph(x, state));
    const target = expr.expressionResultType!.scope.lookupFunction(input.target.name)!;
    const output = new CallField(input.ast, expr, target);

    // TODO: Perform this in its own lowering step
    if(expr.tag !== Tag.GetType){
        args.unshift(expr);
    }

    output.arguments = args;

    // Handle return type polymorphism
    if(input.target.returnType!.tag === Tag.Trait){
        output.expressionResultType = polymorpher.scope.lookupClass("Concrete");
    }

    return output;
});

reg(Constant, (input, polymorpher, state) => {
    return input;
});

reg(Variable, (input, polymorpher, state) => {
    const type = polymorpher.mapping.get(input);

    if(type === undefined && input.value === undefined){
        return input;
    }

    const output = new Variable(
        input.ast,
        input.name,
        type || input.type,
        input.flags,
        input.id
    );

    if(input.value !== undefined){
        // TODO: Change variable type
        output.value = polymorpher.polymorph(input.value, state);

        if(output.value.expressionResultType !== input.value.expressionResultType){
            // We need to change the type of this variable!
            output.type = output.value.expressionResultType!;

            polymorpher.mapping.set(input, output.value.expressionResultType!);
        }
    }

    return output;
});

reg(GetField, (input, polymorpher, state) => {
    const target = polymorpher.polymorph(input.target, state);
    const field = target.expressionResultType!.scope.lookupVariable(input.field.name)!;

    return new GetField(input.ast, target, field);
});

reg(SetField, (input, polymorpher, state) => {
    const target = polymorpher.polymorph(input.target, state);
    const source = polymorpher.polymorph(input.source, state);
    const field  = target.expressionResultType!.scope.lookupVariable(input.field.name)!;

    return new SetField(input.ast, target, field, source);
});

reg(GetVariable, (input, polymorpher, state) => {
    return new GetVariable(input.ast, polymorpher.polymorph(input.variable, state));
});

reg(Return, (input, polymorpher, state) => {
    const value = polymorpher.polymorph(input.value, state);

    if(polymorpher.returnType === null){
        polymorpher.returnType = value.expressionResultType!;
    }

    return new Return(input.ast, value);
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