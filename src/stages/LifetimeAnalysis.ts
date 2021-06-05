import { Register, Visitor } from '../ast/visitor';
import { VariableFlags } from '../nodes/resolved/RDeclVariable';
import { RNode, RNodes } from '../nodes/resolved/RNode';
import { RTag } from '../nodes/resolved/RTag';

function setup(reg: Register<Analysis, RNode, [State], void>) {
    reg(RNodes.DeclClass, (node, visitor) => {});
    reg(RNodes.DeclFunction, (node, visitor, state) => {
        for (const child of node.body) {
            visitor.analyze(state, child);
        }

        console.log(node.body);
    });

    reg(RNodes.DeclVariable, (node, visitor, state) => {
        if (node.value !== null) {
            state.map.set(node, true);
        }
    });

    reg(RNodes.ExprCallStatic, (node, visitor, state) => {
        const as = node.args;
        const ps = node.target.parameters;

        for (let i = 0; i < as.length; i++) {
            const a = as[i];
            const p = ps[i];

            if ((p.flags & VariableFlags.Mutates) > 0) {
                // Mark the variable as used
                state.map.set(a, false);
            }

            console.log(p, a);
        }

        for (let i = 0; i < as.length; i++) {
            const a = as[i];
            const p = ps[i];

            if ((p.flags & VariableFlags.Mutates) > 0) {
                // Un-mark the variable as used
                state.map.set(a, true);
            }

            console.log(p, a);
        }
    });
}

export class State {
    public map = new Map<RNode, boolean>();
}

export class Analysis extends Visitor<RNode, [State], void> {
    public constructor() {
        super(RTag, setup);
    }

    public analyze(state: State, node: RNode) {
        this.visit(node, state);
    }
}