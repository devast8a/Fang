import { Source } from '..';
import { convert, Visitor } from '../ast/visitor';
import { Compiler, Stage } from '../compile';
import { ExprGetLocal, Node, StmtDelete, Tag } from '../nodes';

export class TransformExecuteMacroStage implements Stage {
    public name = "Execute Macro (Stage 0)";

    public execute(compiler: Compiler, nodes: Node[], source: Source): Node[] {
        return transformExecuteMacro.array(nodes, new State());
    }
}

class State {
    public macros = new Map<string, (args: Node[]) => Node>([
        ["delete", (args) => new StmtDelete(convert(args[0], ExprGetLocal).local)]
    ]);
}

export const transformExecuteMacro = new Visitor<State>((node, state) => {
    switch (node.tag) {
        case Tag.ExprMacroCall: {
            const macro = state.macros.get(node.target);

            // Forward macro onto later stages (post name resolution etc...)
            if (macro === undefined) {
                return node;
            }

            // Otherwise execute the macro
            return macro(node.args);
        }
    }

    return node;
});