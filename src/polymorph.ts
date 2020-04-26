import { Type, Function, Thing, CallStatic, Expr, Constant, Variable, Stmt, Tag, GetField, GetVariable, Trait, TagCount, Class, Return, Scope, Construct, CallField } from './ast';
import { canMonomorphize } from './type_api';
import { Mutator, mutator } from './ast/mutator';

export default class Polymorpher extends Mutator<Polymorpher> {
    mapping: Map<Variable, Type>;
    scope: Scope;
    returnType: Type | null = null;

    public constructor(scope: Scope, mapping?: Map<Variable, Type>){
        super();

        if(mapping === undefined){
            this.mapping = new Map();
        } else {
            this.mapping = mapping;
        }

        this.scope = scope;
    }

    public polymorph<T>(input: T) {
        return this.mutate(input);
    }
}

////////////////////////////////////////////////////////////////////////////////////////////////////
mutator(Trait, Polymorpher, (input, data) => {
    return input;
});

mutator(Function, Polymorpher, (input, polymorpher) => {
    let inner = new Polymorpher(polymorpher.scope, polymorpher.mapping);

    let returnType      = input.returnType;
    const parameters    = input.parameters.map(x => inner.polymorph(x));
    const body          = input.body.map(x => inner.polymorph(x));

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

mutator(Class, Polymorpher, (input, polymorpher) => {
    // TODO: Implement Class
    return input;
});

mutator(CallStatic, Polymorpher, (input, polymorpher) => {
    const args    = input.arguments.map(x => polymorpher.polymorph(x));
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
        polymorpher.scope.functions.delete(input.target.name);

        let monomorphized = polymorpher.scope.functions.get(name);
        if(monomorphized === undefined){
            const inner = new Polymorpher(polymorpher.scope, mapping);
            monomorphized = inner.polymorph(input.target);
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

mutator(CallField, Polymorpher, (input, polymorpher) => {
    const expr   = polymorpher.polymorph(input.expression);
    const args   = input.arguments.map(x => polymorpher.polymorph(x));
    const target = expr.expressionResultType!.scope.lookupFunction(input.target.name)!;
    const output = new CallField(input.ast, expr, target);

    output.arguments = args;

    // Handle return type polymorphism
    if(input.target.returnType!.tag === Tag.Trait){
        output.expressionResultType = polymorpher.scope.lookupClass("Concrete");
    }

    return output;
});

mutator(Constant, Polymorpher, (input, polymorpher) => {
    return input;
});

mutator(Variable, Polymorpher, (input, polymorpher) => {
    const type = polymorpher.mapping.get(input);

    if(type === undefined && input.value === undefined){
        return input;
    }

    const output = new Variable(
        input.ast,
        input.name,
        type || input.type,
        input.id
    );

    if(input.value !== undefined){
        // TODO: Change variable type
        output.value = polymorpher.polymorph(input.value);

        if(output.value.expressionResultType !== input.value.expressionResultType){
            // We need to change the type of this variable!
            output.type = output.value.expressionResultType!;

            polymorpher.mapping.set(input, output.value.expressionResultType!);
        }
    }

    return output;
});

mutator(GetField, Polymorpher, (input, polymorpher) => {
    const target = polymorpher.polymorph(input.target);
    const field = target.expressionResultType!.scope.lookupVariable(input.field.name)!;

    return new GetField(input.ast, target, field);
});

mutator(GetVariable, Polymorpher, (input, polymorpher) => {
    return new GetVariable(input.ast, polymorpher.polymorph(input.variable));
});

mutator(Return, Polymorpher, (input, polymorpher) => {
    const value = polymorpher.polymorph(input.value);

    if(polymorpher.returnType === null){
        polymorpher.returnType = value.expressionResultType!;
    }

    return new Return(input.ast, value);
});

mutator(Construct, Polymorpher, (input, polymorpher) => {
    // TODO: Implement Construct
    return input;
});