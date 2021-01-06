import { Register, Visitor } from './ast/visitor';
import { Compiler } from './compile';
import { RNodes } from './nodes/resolved/RNode';
import { RType } from './nodes/resolved/RType';

export class TypeChecker extends Visitor<RType, void, void> {
    public compiler: Compiler;

    public constructor(compiler: Compiler) {
        super(setup, Visitor.VisitByDefault());
        this.compiler = compiler;
    }

    public check = this.visit;
}

function setup(reg: Register<TypeChecker, void, void>) {
    // TODO: Write type checker
}