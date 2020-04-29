import * as Ast from './ast';

type Node = any;

// 
export class CompilerError {
}

export class MissingImplementationError extends CompilerError {
    public constructor(child: Ast.Class, parent: Ast.Trait){
        super();
    }
}

export class ExpressionTypeError extends CompilerError {
    public constructor(target: any, type: Ast.Type, source: Ast.Expr){
        super();
    }
}

// TODO: Suggest symbol
export class MissingIdentifierError extends CompilerError {
    public constructor(identifier: Node, scope: Ast.Scope){
        super();
    }
}

export class NotTraitError extends CompilerError {
    public constructor(trait: Node){
        super();
    }
}

export class TraitImplementingTraitError extends CompilerError {
    public constructor(trait: Node){
        super();
    }
}

export class BadArgumentCountError extends CompilerError {
    public constructor(func: Node){
        super();
    }
}

export class LoanViolationError extends CompilerError {
    public constructor(){
        super();
    }
}