import { Thing, Tag, CallStatic, VariableFlags, Variable, GetVariable, Expr } from './ast';
import { Visitor, Register } from './ast/visitor';
import { Compiler } from './compile';
import { LoanViolationError, SimultaneousLoanError } from './errors';

export class Analyzer extends Visitor<State, void> {
    public compiler: Compiler;

    // TODO: This really ought to be unique per function
    public owned: Set<Variable>;

    public constructor(compiler: Compiler){
        super(setup, Visitor.VisitByDefault());

        this.compiler = compiler;
        this.owned = new Set();
    }

    public check = super.visit;
}

export module Analyzer {
    export class State {

    }
}

type State = Analyzer.State;

export default Analyzer;


////////////////////////////////////////////////////////////////////////////////////////////////////
function setup(reg: Register<Analyzer, State, void>){

reg(CallStatic, (thing, analyzer, state) => {
    // Check that the golden rule is being followed by the program.
    //  "An object must not be mutated using a mutable loan while another loan could observe it"
    //
    // Current strategy is to create a set that tracks variables a target function might mutate.
    // If one of two things happen we could be violating the golden rule.
    //  - A function immutably loans a value AND mutably loans the same value
    //  - A function mutably loans the same value more than once
    //
    // Also check that lifetime rules are being followed.
    //  - Only alive objects are used.
    // TODO: Actually check that only alive objects can be used
    //  - Mark objects as dead when they are moved.
    //  - Only owned objects can be moved.

    interface Loan {
        argument: Expr,
        parameter: Variable,
    };

    const immutable = new Map<Variable, Loan>();
    const mutable = new Map<Variable, Loan>();


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
        const param = params[i];

        switch(param.flags & (VariableFlags.Mutates | VariableFlags.Owns)){
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

                immutable.set(arg.variable, {
                    argument: arg,
                    parameter: params[i],
                });
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
                if(mutable.has(arg.variable)){
                    analyzer.compiler.report(new SimultaneousLoanError({
                        call: thing,
                        immutableArgument: arg,
                        mutableArgument: arg,
                        immutableParameter: params[i],
                        mutableParameter: params[i],
                    }));
                }

                if(analyzer.owned.has(arg.variable)){
                    analyzer.compiler.report(new LoanViolationError());
                }

                mutable.set(arg.variable, {
                    argument: arg,
                    parameter: params[i],
                });
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
                    if(immutable.has(variable) || mutable.has(variable) || analyzer.owned.has(variable)){
                        analyzer.compiler.report(new LoanViolationError());
                    }

                    if((variable.flags & (VariableFlags.Local | VariableFlags.Owns)) === 0){
                        // TODO: Can only move local variables or variables that are owned
                        analyzer.compiler.report(new LoanViolationError());
                    }

                    analyzer.owned.add(variable);
                }

                break;
        }
    }

    for(const i of immutable){
        const m = mutable.get(i[0]);
        if(m !== undefined){
            analyzer.compiler.report(new SimultaneousLoanError({
                call: thing,
                immutableArgument: i[1].argument,
                immutableParameter: i[1].parameter,
                mutableArgument: m.argument,
                mutableParameter: m.parameter,
            }));
        }
    }
});

////////////////////////////////////////////////////////////////////////////////////////////////////
}