import { Register, Visitor } from '../ast/visitor';
import { RNode, RNodes } from '../nodes/resolved/RNode';
import { RTag } from '../nodes/resolved/RTag';
import { RType } from '../nodes/resolved/RType';

export class TypeCheckingStage extends Visitor<RNode, [], void> {
    public constructor() {
        super(RTag, TypeCheckingStage.setup);
    }

    private static setup(reg: Register<TypeCheckingStage, RNode, [], void>) {
        reg(RNodes.DeclClass, (node) => {

        });

        reg(RNodes.DeclFunction, (node, visitor) => {
            for (const child of node.body) {
                visitor.visit(child);
            }
        });

        reg(RNodes.DeclTrait, (node, visitor) => {
        });


        reg(RNodes.DeclVariable, (node, visitor) => {
            if (node.value !== null && !RType.isSameType(node.type, node.value.resultType)) {
                throw new Error("");
            }
        });

        reg(RNodes.ExprCallStatic, (node) => {
            const args = node.args;
            const parameters = node.target.parameters;

            for (let index = 0; index < args.length; index++) {
                if (!RType.isSubType(args[index].resultType, parameters[index].type)) {
                    throw new Error("");
                }
            }
        });
    }

    public check(nodes: Array<RNode>) {
        for (const node of nodes) {
            this.visit(node);
        }
    }
}