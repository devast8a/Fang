import { Type, Tag, Class, Trait, Function } from './ast';

// TODO: Return a member that caused the subtype relation to fail?
export function canSubType(child: Type, parent: Type){
    if(parent === child){
        return true;
    }

    if(parent.tag === Tag.Function || child.tag === Tag.Function){
        // TODO: Support subtype on functions
        throw new Error('canSubType called on function');
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