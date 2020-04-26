import { Thing, Tag, CallStatic, VariableFlags } from './ast';
import { Visitor, visitor } from './ast/visitor';

export class Analyzer extends Visitor<Analyzer> {
    public check(thing: Thing){
        this.visit(thing);
    }

    public default_visitor(thing: Thing, visitor: Analyzer){}
}

////////////////////////////////////////////////////////////////////////////////////////////////////
visitor(CallStatic, Analyzer, (thing, analyzer) => {
    // TODO: We will need to review this code when we go to support variadic functions
    const args = thing.arguments;
    const params = thing.target.parameters;

    const immutableSet = new Set();
    const mutableSet = new Set();

    for(let i = 0; i < args.length; i++){
        const arg = args[i];

        // TODO: Review this comment
        // TODO: Support Fields/Arrays
        // For now, the lifetime of mutable references can not exceed the lifetime of the function
        //  call. So we know if the argument is not a variable expression, then it must be something
        //  else and that something could not store a mutable reference.
        if(arg.tag !== Tag.GetVariable){
            continue;
        }

        if((params[i].flags & VariableFlags.Mutable) === VariableFlags.Mutable){
            mutableSet.add(arg.variable);
        } else {
            immutableSet.add(arg.variable);
        }
    }

    for(const v of immutableSet){
        if(mutableSet.has(v)){
            console.error("!!!");
        }
    }
});