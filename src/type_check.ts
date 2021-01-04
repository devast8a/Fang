import * as Ast from './ast/things';
import { Tag, Thing } from './ast/things';
import { Register, Visitor } from './ast/visitor';
import { Compiler } from './compile';
import { BadArgumentCountError, ExpressionTypeError, MissingImplementationError } from './errors';
import { RType } from './nodes/resolved/RType';
import { canSubType } from './type_api';

export class TypeChecker extends Visitor<State, void> {
    public compiler: Compiler;

    protected default_visitor(thing: Thing, visitor: TypeChecker) {}

    public constructor(compiler: Compiler) {
        super(setup, Visitor.VisitByDefault());
        this.compiler = compiler;
    }

    public check = this.visit;
}

export module TypeChecker {
    export class State {

    }
}

type State = TypeChecker.State;
const State = TypeChecker.State;

export default TypeChecker;

////////////////////////////////////////////////////////////////////////////////////////////////////
function setup(reg: Register<TypeChecker, State, void>) {

reg(Ast.Class, (thing, visitor) => {
    for (const trait of thing.superTypes) {
        if (canSubType(thing, trait as Ast.Trait)) {
            continue;
        }

        visitor.compiler.report(new MissingImplementationError(thing, trait as Ast.Trait));
    }
});

reg(Ast.CallStatic, (thing, visitor, state) => {
    const args = thing.arguments;
    const params = thing.target.parameters;

    if (args.length < params.length) {
        visitor.compiler.report(new BadArgumentCountError(thing));
    } else if (args.length > params.length) {
        visitor.compiler.report(new BadArgumentCountError(thing));
    }

    // HACK: Omit type checking for copy and move because they need to take any type - BUT we have no any type
    if (thing.target === visitor.compiler.functions.copy) {
        thing.expressionResultType = thing.arguments[0].expressionResultType;
        return;
    }
    if (thing.target === visitor.compiler.functions.move) {
        thing.expressionResultType = thing.arguments[0].expressionResultType;
        return;
    }

    for (let i = 0; i < args.length; i++) {
        if (args[i].tag === Tag.Constant) {
            continue;
        }

        visitor.check(args[i], state);

        const context = {}; // TODO: Incorporate context properly
        if (!RType.isSubType(args[i].expressionResultType, params[i].type, context)) {
            // TODO: Use an error specific to calls?
            visitor.compiler.report(new ExpressionTypeError(args[i], params[i].type, args[i]))
        }
    }
});

reg(Ast.CallField, (thing, visitor, state) => {
    const args = thing.arguments;
    const params = thing.target.parameters;

    for (let i = 0; i < args.length; i++) {
        if (args[i].tag === Tag.Constant) {
            continue;
        }

        visitor.check(args[i], state);

        if (args[i].expressionResultType !== params[i].type) {
            // TODO: Use an error specific to calls?
            visitor.compiler.report(new ExpressionTypeError(args[i], params[i].type, args[i]))
        }
    }
});

reg(Ast.Variable, (thing, visitor) => {
    if (thing.value === undefined) {
        return;
    }

    const context = {}; // TODO: Incorporate context properly
    if (!RType.isSubType(thing.value.expressionResultType, thing.type, context)) {
        visitor.compiler.report(new ExpressionTypeError(thing, thing.type, thing.value));
    }
});

reg(Ast.Return, (thing, visitor) => {
    // TODO: Return needs a way to reference the function it is defined in
});

reg(Ast.SetVariable, (thing, visitor) => {
    if (thing.source.expressionResultType !== thing.target.type) {
        visitor.compiler.report(new ExpressionTypeError(thing, thing.target.type, thing.source));
    }
});

reg(Ast.SetField, (thing, visitor) => {
    if (thing.source.expressionResultType !== thing.field.type) {
        visitor.compiler.report(new ExpressionTypeError(thing, thing.field.type, thing.source));
    }
});

////////////////////////////////////////////////////////////////////////////////////////////////////
}