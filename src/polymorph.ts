import { Type, Function, Thing, Call, Expr, Constant, Variable, Stmt, Tag, GetField, GetVariable, Trait, TagCount, visit, Class, Return, Scope, Construct } from './ast';
import { canMonomorphize } from './type_api';

// TODO: Can we remove this junk and maybe tie it in with the visitor system?
export class Data {
    mapping: Map<Variable, Type>;
    scope: Scope;

    public constructor(scope: Scope){
        this.mapping = new Map();
        this.scope = scope;
    }
}

type Polymorpher = (input: Thing, data: Data) => Thing;
const polymorphers = new Array<Polymorpher>();

type Constructor<T = any, P = object> = {new(...args: any[]): any, prototype: P};
export function register<T extends Constructor<Thing> & {tag: Tag}>(
    thing: T,
    handler: (thing: InstanceType<T>, data: Data) => InstanceType<T>
){
    polymorphers[thing.tag] = handler as any;
}

export function polymorph<T>(input: T, data: Data): T {
    const thing = (input as any) as Thing;
    const polymorpher = polymorphers[thing.tag];

    if(polymorpher === undefined){
        throw new Error(`Unknown thing with tag ${Tag[thing.tag]}`)
    }

    return polymorpher(thing, data) as any;
}

////////////////////////////////////////////////////////////////////////////////////////////////////
register(Trait, (input, data) => {
    return input;
});

register(Function, (input, data) => {
    let returnType      = input.returnType;
    const parameters    = input.parameters.map(x => polymorph(x, data));
    const body          = input.body.map(x => polymorph(x, data));

    if(input.returnType!.tag === Tag.Trait){
        returnType = data.scope.lookupClass("Concrete");
    }

    // TODO: Should we replace scope with a duplicate?
    const output = new Function(input.ast, input.name, input.id, input.scope);
    output.returnType = returnType;
    output.parameters = parameters;
    output.body       = body;
    return output;
});

register(Class, (input, data) => {
    // TODO: Implement Class
    return input;
});

register(Call, (input, data) => {
    const expr = (input as any).expression as Expr | undefined;

    // Polymorph the call
    const args    = input.arguments;
    const params  = input.target.parameters;
    const mapping = new Map<Variable, Type>();
    let name      = input.target.name;

    for(let i = 0; i < args.length; i++){
        const argument = args[i];
        const parameter = params[i];

        if(parameter.type.tag === Tag.Trait){
            mapping.set(parameter, argument.expressionResultType!);
            name += "_" + i + "_" + argument.expressionResultType!.name;
        }
    }

    if(mapping.size !== 0){
        throw new Error("Polymorph call");
    }

    if(expr === undefined){
        const args       = input.arguments.map(x => polymorph(x, data));

        const output     = new Call(input.ast, input.target);
        output.arguments = args;

        if(input.target.returnType!.tag === Tag.Trait){
            output.expressionResultType = data.scope.lookupClass("Concrete");
        }

        return output;
    } else {
        const expression = polymorph(expr, data);

        const args       = input.arguments.map(x => polymorph(x, data));
        const target     = expression.expressionResultType!.scope.lookupFunction(input.target.name)!;

        const output     = new Call(input.ast, target);
        output.arguments = args;

        if(input.target.returnType!.tag === Tag.Trait){
            output.expressionResultType = data.scope.lookupClass("Concrete");
        }

        return output;
    }
});

register(Constant, (input, data) => {
    return input;
});

register(Variable, (input, data) => {
    const type = data.mapping.get(input);

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
        output.value = polymorph(input.value, data);

        if(output.value.expressionResultType !== input.value.expressionResultType){
            // We need to change the type of this variable!
            output.type = output.value.expressionResultType!;

            data.mapping.set(input, output.value.expressionResultType!);
        }
    }

    return output;
});

register(GetField, (input, data) => {
    const target = polymorph(input.target, data);
    const field = target.expressionResultType!.scope.lookupVariable(input.field.name)!;

    return new GetField(input.ast, target, field);
});

register(GetVariable, (input, data) => {
    return new GetVariable(input.ast, polymorph(input.variable, data));
});

register(Return, (input, data) => {
    // TODO: Implement Return
    return input;
});

register(Construct, (input, data) => {
    // TODO: Implement Construct
    return input;
});