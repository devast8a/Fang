import { Register, Visitor } from './ast/visitor';
import { Compiler } from './compile';
import { RDeclVariable } from './nodes/resolved/RDeclVariable';
import { RNode } from './nodes/resolved/RNode';

export class Analyzer extends Visitor<RNode, State, void> {
    public compiler: Compiler;

    public constructor(compiler: Compiler) {
        super(setup, Visitor.VisitByDefault());

        this.compiler = compiler;
    }

    public check = super.visit;
}

export module Analyzer {
    export class State {
        public alive = new Map<RDeclVariable, boolean>(); }
}

type State = Analyzer.State;
const State = Analyzer.State;

export default Analyzer;


////////////////////////////////////////////////////////////////////////////////////////////////////
function setup(reg: Register<Analyzer, State, void>) {

////////////////////////////////////////////////////////////////////////////////////////////////////
}