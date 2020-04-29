import { Thing, Tag, CallStatic, VariableFlags } from './ast';
import { Visitor, visitor } from './ast/visitor';
import { Compiler } from './compile';
import { LoanViolationError } from './errors';

export class Analyzer extends Visitor<Analyzer> {
    public compiler: Compiler;

    public constructor(compiler: Compiler){
        super();
        this.compiler = compiler;
    }

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

    // We want to guarantee the golden rule.
    //  "An object must not be mutated using a mutable loan while another loan could observe it"
    //
    // Current strategy is to create a set that tracks variables a target function might mutate.
    // If one of two things happen we could be violating the golden rule.
    //  - A function immutably loans a value AND mutably loans the same value
    //  - A function mutably loans the same value more than once
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
            if(mutableSet.has(arg.variable)){
                analyzer.compiler.report(new LoanViolationError());
            }

            mutableSet.add(arg.variable);
        } else {
            immutableSet.add(arg.variable);
        }
    }

    for(const v of immutableSet){
        if(mutableSet.has(v)){
            analyzer.compiler.report(new LoanViolationError());
        }
    }
});