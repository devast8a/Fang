import { Type, Tag, Class, Trait, Function, Thing, Constant, Variable, GetField, Expr, GetVariable, Call } from './ast';

// TODO: Return a member that caused the subtype relation to fail?
export function canSubType(child: Type, parent: Type){
    if(parent === child){
        return true;
    }

    if(parent.tag === Tag.Function){
        if(child.tag === Tag.Function){
            return canSubTypeFunction(child, parent);
        }
        throw new Error('Not Implemented Yet: canSubType called with function and non-function');
    } else if(child.tag === Tag.Function){
        throw new Error('Not Implemented Yet: canSubType called with function and non-function');
    }

    for(const [id, pm] of parent.members){
        const cm = child.members.get(id);

        if(cm === undefined){
            return false;
        }

        const ct = (cm.tag === Tag.Variable ? cm.type : cm);
        const pt = (pm.tag === Tag.Variable ? pm.type : pm);

        if(!canSubType(ct, pt)){
            return false;
        }
    }

    return true;
}

export function canSubTypeFunction(child: Function, parent: Function){
    if(child === parent){
        return true;
    }

    if(child.parameters.length !== parent.parameters.length){
        return false;
    }

    if(child.returnType !== undefined && parent.returnType !== undefined){
        //TODO: use isSubType here
        if(!canSubType(child.returnType, parent.returnType)){
            return false;
        }
    }

    for(let i = 0; i < child.parameters.length; i++){
        //TODO: use isSubType here
        if(!canSubType(parent.parameters[i].type, child.parameters[i].type)){
            return false;
        }
    }

    return true;
}

export function canMonomorphize(func: Function){
    for(const parameter of func.parameters){
        if(parameter.type.tag === Tag.Trait){
            return true;
        }
    }

    return false;
}

export function polymorph<T>(input: T, types: Map<Type, Type>): T {
    return polymorphInner(input as any, types) as any;
}

function polymorphInner(input: Thing, types: Map<Type, Type>): Thing {
    switch(input.tag){
        case Tag.Class: {
            throw new Error("Not implemented yet");
        }
        case Tag.Function: {
            const returnType    = types.get(input.returnType!) || input.returnType!;
            const parameters    = input.parameters.map(x => polymorph(x, types));
            const body          = input.body.map(x => polymorph(x, types));

            // TODO: Should we replace scope with a duplicate?
            const output = new Function(input.ast, input.name, input.id, input.scope);
            output.returnType = returnType;
            output.parameters = parameters;
            output.body       = body;
            return output;
        }
        case Tag.Trait: {
            throw new Error("Not implemented yet");
        }
        case Tag.Variable: {
            return new Variable(input.ast, input.name, types.get(input.type) || input.type, input.id);
        }

        case Tag.Call: {
            if((input as any).expression === undefined){
                const args       = input.arguments.map(x => polymorph(x, types));

                const output = new Call(input.ast, input.target);
                output.resultType = input.resultType;
                output.arguments = args;
                return output;
            } else {
                const args       = input.arguments.map(x => polymorph(x, types));
                const expression = polymorph((input as any).expression as Expr, types);
                const type       = types.get(expression.resultType!) || expression.resultType!; // TODO: Optimise double lookups
                const target     = type.scope.lookupFunction(input.target.name);

                if(target === undefined){
                    throw new Error("Invariant broken: Type checking should ensure lookupVariable always returns a value");
                }

                const output = new Call(input.ast, target);
                output.resultType = target.returnType;
                output.arguments = args;
                return output;
            }
        }
        case Tag.Constant: {
            // Constants can never be polymorphic
            return input;
        }
        case Tag.Construct: {
            throw new Error("Not implemented yet");
        }
        case Tag.GetField: {
            const target = polymorph(input.target, types);
            const type = types.get(target.resultType!) || target.resultType!; // TODO: Optimise double lookups

            const field = type.scope.lookupVariable(input.field.name);
            if(field === undefined){
                throw new Error("Invariant broken: Type checking should ensure lookupVariable always returns a value");
            }

            const output = new GetField(input.ast, target, field);
            output.resultType = target.resultType; // TODO: Move into GetField constructor
            return output;
        }
        case Tag.GetVariable: {
            return new GetVariable(input.ast, polymorph(input.variable, types));
        }
        case Tag.SetField: {
            throw new Error("Not implemented yet");
        }
        case Tag.SetVariable: {
            throw new Error("Not implemented yet");
        }
        case Tag.Return: {
            throw new Error("Not implemented yet");
        }
        default: throw new Error(`Incomplete switch (${Tag[(input as any).tag]})`);
    }
}