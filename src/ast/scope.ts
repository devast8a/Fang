import { Class, Function, Trait, Type, Variable, Tag } from './things';

export class Scope {
    public readonly classNameMap        = new Map<string, Class>();
    public readonly functionNameMap     = new Map<string, Function>();
    public readonly traitNameMap        = new Map<string, Trait>();
    public readonly typeNameMap         = new Map<string, Type>();
    public readonly variableNameMap     = new Map<string, Variable>();

    public readonly classes    = new Array<Class>();
    public readonly functions  = new Array<Function>();
    public readonly traits     = new Array<Trait>();
    public readonly types      = new Array<Type>();
    public readonly variables  = new Array<Variable>();

    public readonly parent: Scope | null;
    public readonly id: string;

    public constructor(id: string, parent?: Scope) {
        this.id = id;
        this.parent = parent === undefined ? null : parent;
    }

    public declareClass     = Scope.declare(scope => scope.classes, scope => scope.classNameMap);
    public lookupClass      = Scope.lookup(scope => scope.classNameMap);

    public lookupFunction   = Scope.lookup(scope => scope.functionNameMap);
    public declareFunction  = Scope.declare(scope => scope.functions, scope => scope.functionNameMap);

    public lookupTrait      = Scope.lookup(scope => scope.traitNameMap);
    public declareTrait     = Scope.declare(scope => scope.traits, scope => scope.traitNameMap);

    public lookupVariable   = Scope.lookup(scope => scope.variableNameMap);
    public declareVariable  = Scope.declare(scope => scope.variables, scope => scope.variableNameMap);

    public lookupType       = Scope.lookup(scope => scope.typeNameMap);
    public declareType(thing: Type) {
        if (this.typeNameMap.has(thing.name)) {
            throw new Error('Not implemented yet');
        }

        switch (thing.tag) {
            case Tag.DeclClass:             return this.declareClass(thing);
            case Tag.DeclFunction:          return this.declareFunction(thing);
            case Tag.DeclTrait:             return this.declareTrait(thing);
            //case Tag.GenericParameter:  return this.declareGenericParameter(thing);
            default: throw new Error('Incomplete switch (declareType)');
        }
    }

    private static declare<T>(
        declared: (scope: Scope) => Array<T>,
        map: (scope: Scope) => Map<string, T>
    ) {
        return function(this: Scope, thing: T) {
            const _thing = thing as any;
            const name = _thing.name;

            if (this.typeNameMap.has(name)) {
                throw new Error('Not implemented yet');
            }

            map(this).set(name, thing);
            declared(this).push(thing);

            if (_thing.tag !== Tag.Variable) {
                this.typeNameMap.set(name, _thing);
                this.types.push(_thing);
            }
        }
    }

    private static lookup<T>(getMap: (scope: Scope) => Map<string, T>) {
        return function(this: Scope, name: string) {
            const thing = getMap(this).get(name);

            if (thing !== undefined) {
                return thing;
            }

            let parent = this.parent;
            while (parent !== null) {
                const thing = getMap(parent).get(name);

                if (thing !== undefined) {
                    // Import name into local scope for fast lookups
                    getMap(this).set(name, thing);
                    return thing;
                }

                parent = parent.parent;
            }

            return undefined;
        }
    }
}