import { Type, Tag, Class, Trait, Function, Thing, Constant, Variable, GetField, Expr, GetVariable, CallStatic } from './ast/things';

export function isSubType(child: Type, parent: Type){
    if(parent === child){
        return true;
    }

    if(child.tag === Tag.Function || parent.tag === Tag.Function){
        throw new Error("Not implemented yet. isSubType used on functions");
    }

    if(child.tag === Tag.Class){
        return child.traits.has(parent.name);
    }

    return false;
}

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
    // TODO: Avoid this hack
    if(func.returnType !== undefined){
        if(func.returnType.tag === Tag.Trait){
            return true;
        }
    }

    for(const parameter of func.parameters){
        if(parameter.type.tag === Tag.Trait){
            return true;
        }
    }

    return false;
}