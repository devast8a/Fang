import { VisitChildren } from '../ast/VisitChildren';
import { createVisitor } from '../ast/visitor';
import { Context, MutContext, Node, NodeFree, Tag } from '../nodes';

export const resolveImports = createVisitor(VisitChildren, (context, node, id, state) => {
    switch (node.tag) {
        case Tag.ExprCall: {
            if (!node.compileTime) {
                return node;
            }

            if (node.target.tag !== Tag.RefName) {
                return node;
            }

            switch (node.target.name) {
                case "import": return macroImport(context, node.args[0]);
                default: return node;
            }
        }
    }

    return node;
});

function macroImport(context: Context, argId: number): Node {
    context.compiler.parseFileSync(MutContext.fromContext(context), "./examples/foo.fang");

    (context.container.nodes as any)[argId] = new NodeFree();
    return new NodeFree();
}
