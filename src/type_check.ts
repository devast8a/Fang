import { Visitor, VisitorFn, TagCount, Thing, visit, Tag, register } from './ast';
import * as Ast from './ast';
import { canSubType, canMonomorphize, isSubType } from './type_api';
import { Compiler } from './compile';

export class TypeChecker implements Visitor<TypeChecker> {
    public visit: Array<VisitorFn<TypeChecker>>;
    public compiler: Compiler;

    public constructor(compiler: Compiler){
        this.visit = visitors;
        this.compiler = compiler;
    }

    public check(thing: Thing){
        visit(thing, this);
    }
}

function dummy(){}
export const visitors = new Array<VisitorFn<TypeChecker>>(TagCount).fill(dummy);

register(Ast.Class, visitors, (visitor, thing) => {
    for(const trait of thing.traits.values()){
        if(canSubType(thing, trait)){
            continue;
        }

        visitor.compiler.report(new MissingImplementationsError(thing, trait));
    }
});

register(Ast.Call, visitors, (visitor, thing) => {
    // TODO: Check if a function is polymorphic somewhere else
    if(canMonomorphize(thing.target)){
        visitor.compiler.callsToMonomorphize.push(thing);
    }

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

register(Ast.Variable, visitors, (visitor, thing) => {
    if(thing.value === undefined){
        return;
    }

    if(!isSubType(thing.value.expressionResultType!, thing.type)){
        visitor.compiler.report(new ExpressionTypeError(thing, thing.type, thing.value));
    }
});

register(Ast.Return, visitors, (visitor, thing) => {
    // TODO: Return needs a way to reference the function it is defined in
});

register(Ast.SetVariable, visitors, (visitor, thing) => {
    if(thing.source.expressionResultType !== thing.target.type){
        visitor.compiler.report(new ExpressionTypeError(thing, thing.target.type, thing.source));
    }
});

register(Ast.SetField, visitors, (visitor, thing) => {
    if(thing.source.expressionResultType !== thing.field.type){
        visitor.compiler.report(new ExpressionTypeError(thing, thing.field.type, thing.source));
    }
});

export class MissingImplementationsError {
    public constructor(child: Ast.Class, parent: Ast.Trait){

    }
}

export class ExpressionTypeError {
    public constructor(target: any, type: Ast.Type, source: Ast.Expr){

    }
}
