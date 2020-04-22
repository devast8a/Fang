import { Type, Function, Thing, CallStatic, Expr, Constant, Variable, Stmt, Tag, GetField, GetVariable, Trait, TagCount, visit, Class, Return, Scope, Construct, CallField } from './ast';
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

register(CallStatic, (input, data) => {
    const expr = (input as any).expression as Expr | undefined;
    const args       = input.arguments.map(x => polymorph(x, data));

    const output     = new CallStatic(input.ast, input.target);
    output.arguments = args;

    if(input.target.returnType!.tag === Tag.Trait){
        output.expressionResultType = data.scope.lookupClass("Concrete");
    }

    return output;
});

register(CallField, (input, data) => {
    const expr   = polymorph(input.expression, data);
    const args   = input.arguments.map(x => polymorph(x, data));
    const target = expr.expressionResultType!.scope.lookupFunction(input.target.name)!;
    const output = new CallField(input.ast, expr, target);

    output.arguments = args;

    // Handle return type polymorphism
    if(input.target.returnType!.tag === Tag.Trait){
        output.expressionResultType = data.scope.lookupClass("Concrete");
    }

    return output;
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