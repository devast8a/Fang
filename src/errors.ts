import * as Ast from './ast';

type Node = any;

export class MissingImplementationError {
    public constructor(child: Ast.Class, parent: Ast.Trait){

    }
}

export class ExpressionTypeError {
    public constructor(target: any, type: Ast.Type, source: Ast.Expr){

    }
}

// TODO: Suggest symbol
export class MissingIdentifierError {
    public constructor(identifier: Node, scope: Ast.Scope){

    }
}

export class NotTraitError {
    public constructor(trait: Node){

    }
}

export class TraitImplementingTraitError {
    public constructor(trait: Node){

    }
}

// 
export class CompilerError {
    public constructor(text: string, blame: Node){

    }
}