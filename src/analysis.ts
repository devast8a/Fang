import { CallField, CallStatic, Expr, Function, GetVariable, SetVariable, Tag, Thing, Variable, VariableFlags } from './ast/things';
import { Register, Visitor } from './ast/visitor';
import { Compiler } from './compile';
import { LoanViolationError, SimultaneousLoanError } from './errors';

export class Analyzer extends Visitor<Thing, State, void> {
    public compiler: Compiler;

    public constructor(compiler: Compiler) {
        super(setup, Visitor.VisitByDefault());

        this.compiler = compiler;
    }

    public check = super.visit;
}

export module Analyzer {
    export class State {
        public nodes = new Array<Thing>();
        public alive = new Map<Variable, boolean>();
    }
}

type State = Analyzer.State;
const State = Analyzer.State;

export default Analyzer;


////////////////////////////////////////////////////////////////////////////////////////////////////
function setup(reg: Register<Analyzer, State, void>) {

reg(Function, (thing, analyzer, state) => {
    // Create a new state for functions
    const functionState = new State();

    for (const parameter of thing.parameters) {
        analyzer.check(parameter, functionState);
        functionState.alive.set(parameter, true);
    }

    // TODO: Don't avoid analyzing block
    for (const stmt of thing.body.block) {
        analyzer.check(stmt, functionState);
    }

    // TODO: Do a better check for destructors
    if (thing.name === 'destructor') {
        return;
    }

    for (const [variable, alive] of functionState.alive) {
        if (alive && (variable.flags & (VariableFlags.Local | VariableFlags.Owns))) {
            // TODO: Fix
            //const destructor = variable.type.scope.lookupFunction("destructor");

            //if (destructor !== undefined) {
            //    const target = new CallStatic(null, destructor);
            //    target.arguments.push(new GetVariable(null, variable));
            //    thing.body.block.push(target);
            //}
        }
    }
});

reg(Variable, (thing, analyzer, state) => {
    state.alive.set(thing, thing.value !== undefined);
});

reg(SetVariable, (thing, analyzer, state) => {
    analyzer.check(thing.source, state);

    state.alive.set(thing.target, true);
});

reg(CallStatic, HandleFunctionCall);
reg(CallField, HandleFunctionCall);

////////////////////////////////////////////////////////////////////////////////////////////////////
}

interface Loan {
    argument: Expr,
    parameter: Variable,
}

function isMove(expression: Expr, analyzer: Analyzer) {
    if (expression.tag !== Tag.CallStatic) {
        return false;
    }

    return expression.target === analyzer.compiler.functions.move;
}

function getCopyOrMoveTarget(expression: Expr, analyzer: Analyzer) {
    if (expression.tag !== Tag.CallStatic) {
        return null;
    }

    if (expression.target !== analyzer.compiler.functions.copy &&
        expression.target !== analyzer.compiler.functions.move) {
        return null;
    }

    // TODO: Support moving fields/arrays etc...
    return (expression.arguments[0] as GetVariable).variable;
}

function HandleFunctionCall(thing: CallStatic | CallField, analyzer: Analyzer, state: State) {
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
    //  - Mark objects as dead when they are moved.
    //  - Only owned objects can be moved.

    const immutable = new Map<Variable, Loan>();
    const mutable = new Map<Variable, Loan>();


    const as = thing.arguments;
    const ps = thing.target.parameters;

    for (let i = 0; i < as.length; i++) {
        // TODO: Support Fields/Arrays

        const argument = as[i];
        const parameter = ps[i];

        if (parameter.flags & VariableFlags.Owns) {
            HandleOwnedParameter(analyzer, state, argument);
            continue;
        }

        analyzer.check(argument, state);

        if (argument.tag !== Tag.GetVariable) {
            continue;
        }

        if (!state.alive.get(argument.variable)) {
            // Variable isn't alive
            analyzer.compiler.report(new LoanViolationError());
            continue;
        }

        const loan = {argument, parameter};

        if (parameter.flags & VariableFlags.Mutates) {
            // Check call does not result in a mutable and immutable loan of a value
            let other = immutable.get(argument.variable);
            if (other !== undefined) {
                reportSimultaneousLoan(analyzer, thing, loan, other);
            }

            // Check call does not result in multiple mutable loans of same value
            other = mutable.get(argument.variable);
            if (other !== undefined) {
                reportSimultaneousLoan(analyzer, thing, loan, other);
            }

            mutable.set(argument.variable, loan);
        } else {
            // Check call does not result in a mutable and immutable loan of a value
            const other = mutable.get(argument.variable);
            if (other !== undefined) {
                reportSimultaneousLoan(analyzer, thing, other, loan);
            }

            immutable.set(argument.variable, loan);
        }
    }
}

function HandleOwnedParameter(analyzer: Analyzer, state: State, argument: Expr) {
    const variable = getCopyOrMoveTarget(argument, analyzer);

    if (variable === null) {
        // Must use copy or move into an owned variable
        // TODO: Add syntax sugar for function results
        analyzer.compiler.report(new LoanViolationError());
        return;
    }

    if (!state.alive.get(variable)) {
        // Variable isn't alive
        analyzer.compiler.report(new LoanViolationError());
        return;
    }

    if (isMove(argument, analyzer)) {
        // Moved variables are no longer alive in the scope
        state.alive.set(variable, false);
    }
}

function reportSimultaneousLoan(analyzer: Analyzer, call: CallStatic | CallField, mutable: Loan, immutable: Loan) {
    analyzer.compiler.report(new SimultaneousLoanError({
        call: call,
        immutableArgument: immutable.argument,
        immutableParameter: immutable.parameter,
        mutableArgument: mutable.argument,
        mutableParameter: mutable.parameter,
    }));
}

function reportMultipleMutates(analyzer: Analyzer, call: CallStatic, mutable: Loan, immutable: Loan) {
    analyzer.compiler.report(new LoanViolationError());
}