import { Class, Function, Trait, Type, Variable, Tag } from './things';

export class Scope {
    public readonly classes    = new Map<string, Class>();
    public readonly functions  = new Map<string, Function>();
    public readonly traits     = new Map<string, Trait>();
    public readonly types      = new Map<string, Type>();
    public readonly variables  = new Map<string, Variable>();

    public readonly parent: Scope | null;
    public readonly id: string;

    public constructor(id: string, parent?: Scope){
        this.id = id;
        this.parent = parent === undefined ? null : parent;
    }

    public declareClass(thing: Class){
        if(this.types.has(thing.name)){
            throw new Error('Not implemented yet');
        }

        this.classes.set(thing.name, thing);
        this.types.set(thing.name, thing);
    }

    public declareFunction(thing: Function){
        if(this.types.has(thing.name)){
            throw new Error('Not implemented yet');
        }

        this.functions.set(thing.name, thing);
        this.types.set(thing.name, thing);
    }

    public declareTrait(thing: Trait){
        if(this.types.has(thing.name)){
            throw new Error('Not implemented yet');
        }

        this.traits.set(thing.name, thing);
        this.types.set(thing.name, thing);
    }

    public declareType(thing: Type){
        if(this.types.has(thing.name)){
            throw new Error('Not implemented yet');
        }

        switch(thing.tag){
            case Tag.Class:     return this.declareClass(thing);
            case Tag.Function:  return this.declareFunction(thing);
            case Tag.Trait:     return this.declareTrait(thing);
            default: throw new Error('Incomplete switch');
        }
    }

    public declareVariable(thing: Variable){
        if(this.variables.has(thing.name)){
            throw new Error('Not implemented yet');
        }

        this.variables.set(thing.name, thing);
    }

    private static lookup<T>(
        scope: Scope,
        name: string,
        getMap: (scope: Scope) => Map<string, T>,
        register: (this: Scope, thing: T) => void,
    ){
        const thing = getMap(scope).get(name);

        if(thing !== undefined){
            return thing;
        }

        let parent = scope.parent;
        while(parent !== null){
            const thing = getMap(parent).get(name);

            if(thing !== undefined){
                // Import name into local scope for fast lookups
                register.call(scope, thing);
                return thing;
            }

            parent = parent.parent;
        }

        return undefined;
    }

    public lookupClass(name: string) {
        return Scope.lookup(this, name, x => x.classes, Scope.prototype.declareClass);
    }

    public lookupFunction(name: string) {
        return Scope.lookup(this, name, x => x.functions, Scope.prototype.declareFunction);
    }

    public lookupTrait(name: string){
        return Scope.lookup(this, name, x => x.traits, Scope.prototype.declareTrait);
    }

    public lookupType(name: string) {
        return Scope.lookup(this, name, x => x.types, Scope.prototype.declareType);
    }

    public lookupVariable(name: string) {
        return Scope.lookup(this, name, x => x.variables, Scope.prototype.declareVariable);
    }
}