import { convert, Visitor } from '../ast/visitor';
import { Compiler, ParseContext, ParseStage } from '../compile';
import { ExprGetLocal, Node, ExprDestroyLocal, Tag, Context } from '../nodes';

export class TransformExecuteMacroStage implements ParseStage {
    public name = "Execute Macro (Stage 0)";

    public execute(compiler: Compiler, nodes: Node[], context: ParseContext): Node[] {
        // TODO: Properly set container
        const ctx = new Context(context.module, context.module);
        return transformExecuteMacro.array(nodes, ctx, new State());
    }
}

class State {
    public macros = new Map<string, (args: Node[]) => Node>([
        ["delete", (args) => new ExprDestroyLocal(convert(args[0], ExprGetLocal).local)]
    ]);
}

const transformExecuteMacro = new Visitor<State>({
    after: (node, context, state) => {
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
    }
});