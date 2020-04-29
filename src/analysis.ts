import { Thing, Tag, CallStatic, VariableFlags, Variable, GetVariable } from './ast';
import { Visitor, visitor } from './ast/visitor';
import { Compiler } from './compile';
import { LoanViolationError } from './errors';

export class Analyzer extends Visitor<Analyzer> {
    public compiler: Compiler;

    // TODO: This really ought to be unique per function
    public owned: Set<Variable>;

    public constructor(compiler: Compiler){
        super();
        this.compiler = compiler;
        this.owned = new Set();
    }

    public check(thing: Thing){
        this.visit(thing);
    }

    public default_visitor(thing: Thing, visitor: Analyzer){}
}

////////////////////////////////////////////////////////////////////////////////////////////////////
visitor(CallStatic, Analyzer, (thing, analyzer) => {
    // We want to guarantee the golden rule.
    //  "An object must not be mutated using a mutable loan while another loan could observe it"
    //
    // Current strategy is to create a set that tracks variables a target function might mutate.
    // If one of two things happen we could be violating the golden rule.
    //  - A function immutably loans a value AND mutably loans the same value
    //  - A function mutably loans the same value more than once
    const immutableSet = new Set();
    const mutableSet = new Set();


    // HACK: Omit analyzing for copy/move - we use them as part of ownership analysis
    if(thing.target === analyzer.compiler.functions.copy){
        return;
    }
    if(thing.target === analyzer.compiler.functions.move){
        return;
    }

    // TODO: We will need to review this code when we go to support variadic functions
    const args = thing.arguments;
    const params = thing.target.parameters;

    for(let i = 0; i < args.length; i++){
        const arg = args[i];

        switch(params[i].flags & (VariableFlags.Mutates | VariableFlags.Owns)){
            // Unmarked parameters are by default immutable.
            default:
                // TODO: Review this comment
                // TODO: Support Fields/Arrays
                // For now, the lifetime of mutable references can not exceed the lifetime of the function
                //  call. So we know if the argument is not a variable expression, then it must be something
                //  else and that something could not store a mutable reference.
                if(arg.tag !== Tag.GetVariable){
                    continue;
                }

                if(analyzer.owned.has(arg.variable)){
                    analyzer.compiler.report(new LoanViolationError());
                }

                immutableSet.add(arg.variable);
                break;

            // Marked as ONLY mutable.
            // Check if a function mutably loans the same value more than once
            case VariableFlags.Mutates:
                // TODO: Review this comment
                // For now, the lifetime of mutable references can not exceed the lifetime of the function
                //  call. So we know if the argument is not a variable expression, then it must be something
                //  else and that something could not store a mutable reference.
                if(arg.tag !== Tag.GetVariable){
                    continue;
                }

                // TODO: Don't merge these conditions. We should probably emit two different error types
                if(mutableSet.has(arg.variable)){
                    analyzer.compiler.report(new LoanViolationError());
                }

                if(analyzer.owned.has(arg.variable)){
                    analyzer.compiler.report(new LoanViolationError());
                }

                mutableSet.add(arg.variable);
                break;

            // Marked as owned or as both owned and mutable.
            // From the caller, it does not matter whether the callee function mutates its owned parameter or not
            case VariableFlags.Owns:
            case VariableFlags.Owns | VariableFlags.Mutates:
                // Must move or copy into an owned parameter
                if(arg.tag !== Tag.CallStatic){
                    // TODO: Must use move or copy
                    analyzer.compiler.report(new LoanViolationError());
                    continue;
                }

                if(arg.arguments.length !== 1 || arg.arguments[0].tag !== Tag.GetVariable){
                    // TODO: Copy or move only allowed for variables
                    analyzer.compiler.report(new LoanViolationError());
                    continue;
                }

                const variable = (arg.arguments[0] as GetVariable).variable;

                if(arg.target === analyzer.compiler.functions.copy){
                    if(analyzer.owned.has(variable)){
                        analyzer.compiler.report(new LoanViolationError());
                    }
                }

                if(arg.target === analyzer.compiler.functions.move){
                    if(immutableSet.has(variable) || mutableSet.has(variable) || analyzer.owned.has(variable)){
                        analyzer.compiler.report(new LoanViolationError());
                    }

                    analyzer.owned.add(variable);
                }

                break;
        }
    }

    for(const v of immutableSet){
        if(mutableSet.has(v)){
            analyzer.compiler.report(new LoanViolationError());
        }
    }
});