import { TagCount, Thing, Tag } from './ast';
import * as Ast from './ast';
import { canSubType, canMonomorphize, isSubType } from './type_api';
import { Compiler } from './compile';
import { Visitor, visitor } from './ast/visitor';
import { ExpressionTypeError, MissingImplementationError, BadArgumentCountError } from './errors';

export class TypeChecker extends Visitor<TypeChecker> {
    public compiler: Compiler;

    protected default_visitor(thing: Thing, visitor: TypeChecker){}

    public constructor(compiler: Compiler){
        super();
        this.compiler = compiler;
    }

    public check(thing: Thing){
        this.visit(thing);
    }
}

visitor(Ast.Class, TypeChecker, (thing, visitor) => {
    for(const trait of thing.traits.values()){
        if(canSubType(thing, trait)){
            continue;
        }

        visitor.compiler.report(new MissingImplementationError(thing, trait));
    }
});

visitor(Ast.CallStatic, TypeChecker, (thing, visitor) => {
    const args = thing.arguments;
    const params = thing.target.parameters;

    if(args.length < params.length){
        visitor.compiler.report(new BadArgumentCountError(thing));
    } else if (args.length > params.length){
        visitor.compiler.report(new BadArgumentCountError(thing));
    }

    for(let i = 0; i < args.length; i++){
        if(args[i].tag === Tag.Constant){
            continue;
        }

        if(args[i].expressionResultType !== params[i].type){
            // TODO: Use an error specific to calls?
            visitor.compiler.report(new ExpressionTypeError(args[i], params[i].type, args[i]))
        }
    }
});

visitor(Ast.CallField, TypeChecker, (thing, visitor) => {
    const args = thing.arguments;
    const params = thing.target.parameters;

    for(let i = 0; i < args.length; i++){
        if(args[i].tag === Tag.Constant){
            continue;
        }

        if(args[i].expressionResultType !== params[i].type){
            // TODO: Use an error specific to calls?
            visitor.compiler.report(new ExpressionTypeError(args[i], params[i].type, args[i]))
        }
    }
});

visitor(Ast.Variable, TypeChecker, (thing, visitor) => {
    if(thing.value === undefined){
        return;
    }

    if(!isSubType(thing.value.expressionResultType!, thing.type)){
        visitor.compiler.report(new ExpressionTypeError(thing, thing.type, thing.value));
    }
});

visitor(Ast.Return, TypeChecker, (thing, visitor) => {
    // TODO: Return needs a way to reference the function it is defined in
});

visitor(Ast.SetVariable, TypeChecker, (thing, visitor) => {
    if(thing.source.expressionResultType !== thing.target.type){
        visitor.compiler.report(new ExpressionTypeError(thing, thing.target.type, thing.source));
    }
});

visitor(Ast.SetField, TypeChecker, (thing, visitor) => {
    if(thing.source.expressionResultType !== thing.field.type){
        visitor.compiler.report(new ExpressionTypeError(thing, thing.field.type, thing.source));
    }
});
