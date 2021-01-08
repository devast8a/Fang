import { Register, Visitor } from '../ast/visitor';
import { RDeclFunction } from '../nodes/resolved/RDeclFunction';
import { RNode, RNodes } from '../nodes/resolved/RNode';
import { RTag } from '../nodes/resolved/RTag';
import { RType } from '../nodes/resolved/RType';

export class MonomorphizeStage extends Visitor<RNode, [RType.Context], RNode> {
    public constructor() {
        super(RTag, MonomorphizeStage.setup);
    }

    public monomorphize(nodes: RNode[]) {
        const context = new RType.Context();
        const output = [];

        for (const node of nodes) {
            output.push(this.visit(node, context));
        }

        return output;
    }

    private static setup(reg: Register<MonomorphizeStage, RNode, [RType.Context], RNode>) {
        reg(RNodes.DeclClass, (node) => {
            return node;
        });

        reg(RNodes.DeclFunction, (node, visitor, context) => {
            // We don't want to monomorphize generic functions at this stage
            if (isGenericFunction(node, context)) {
                return node;
            }

            for (const child of node.body) {
                visitor.visit(child, context);
            }

            return node;
        });

        reg(RNodes.DeclTrait, (node) => {
            return node;
        });

        reg(RNodes.DeclVariable, (node) => {
            return node;
        });

        reg(RNodes.ExprCallStatic, (node, visitor, context) => {
            if (isGenericFunction(node.target, context)) {
                for (let i = 0; i < node.args.length; i++) {
                    const param = node.target.parameters[i];

                    if (isGenericType(param.type!, context)) {
                        context.map(param.type!, node.args[i].resultType);
                    }
                }

                // TODO: Avoid subverting readonly access modifier with any
                (node as any).target = instantiate(node.target, context);
            }

            if (isGenericType(node.target.returnType, context)) {
                // TODO: Set the real return type of the function
            }

            return node;
        });
    }
}

export function instantiate(func: RNodes.DeclFunction, context: RType.Context) {
    return func;
}

export function isGenericType(type: RType, context: RType.Context): boolean {
    // TODO: Types should be completely resolved at this point.
    if (type === undefined) {
        return false;
    }

    switch (type.tag) {
        case RTag.DeclClass:        return false;
        case RTag.DeclFunction:     return true;
        case RTag.DeclTrait:        return true;
        case RTag.Generic:          return true;
        case RTag.GenericApply:     return type.args.some(type => isGenericType(type, context));
        case RTag.GenericParameter: return isGenericType(context.resolve(type), context);
        case RTag.TypeAtom:         return isGenericType(type.type, context);
    }

    throw new Error(`needsRewriteType does not handle node with tag ${RTag[(type as any).tag]}`);
}

export function isGenericFunction(func: RDeclFunction, context: RType.Context) {
    return func.parameters.some(parameter => isGenericType(parameter.type!, context));
}