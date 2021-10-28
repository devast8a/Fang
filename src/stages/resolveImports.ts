import { VisitChildren } from '../ast/VisitChildren';
import { createVisitor } from '../ast/visitor';
import { Context, ExprConstant, Node, RefName, Tag, TypeGet } from '../nodes';

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
    const arg = context.get(argId);

    console.log(arg);
    
    return new ExprConstant(new TypeGet(new RefName("u32")), 1)
}
