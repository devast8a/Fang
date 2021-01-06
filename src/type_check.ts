import { Register, Visitor } from './ast/visitor';
import { Compiler } from './compile';
import { BadArgumentCountError, ExpressionTypeError, MissingImplementationError } from './errors';
import { Context } from './nodes/resolved/Context';
import { RNode } from './nodes/resolved/RNode';
import { RType } from './nodes/resolved/RType';
import { canSubType } from './type_api';

export class TypeChecker extends Visitor<RType, void, void> {
    public compiler: Compiler;

    protected default_visitor(node: RNode, visitor: TypeChecker) {}

    public constructor(compiler: Compiler) {
        super(setup, Visitor.VisitByDefault());
        this.compiler = compiler;
    }

    public check = this.visit;
}

////////////////////////////////////////////////////////////////////////////////////////////////////
function setup(reg: Register<TypeChecker, void, void>) {


////////////////////////////////////////////////////////////////////////////////////////////////////
}