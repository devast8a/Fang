import { VisitChildren } from '../ast/VisitChildren';
import { createVisitor } from '../ast/visitor';
import { Flags } from '../common/flags';
import { IncorrectTypeError, TypeErrors } from '../errors';
import { Context, DeclFunction, DeclStruct, DeclVariable, DeclVariableFlags, Expr, Node, RefGlobal, Tag, Type, TypeGenericApply, TypeGet, unreachable } from '../nodes';

export const checkTypes = createVisitor(VisitChildren, (context, node, id) => {
    switch (node.tag) {
        case Tag.DeclVariable: {
            if (node.value !== null) {
                const source = context.get(node.value)
                const sourceType = Expr.getReturnType(context, source);

                if (!Type.canAssignTo(context, sourceType, node.type)) {
                    context.error(new IncorrectTypeError(context, node.value, sourceType, id, node.type, id));
                }
            }

            return node;
        }

        case Tag.ExprCall: {
            // Get target function
            const target = context.get(node.target);

            // Hack for 'alias'
            if (target.name === 'alias') {
                return node;
            }

            for (let index = 0; index < node.args.length; index++) {
                const argumentId = node.args[index];
                const parameterId = target.parameters[index];

                const argument = context.get(argumentId);
                const parameter = context.get(parameterId, target.children) as DeclVariable;

                const argumentType = Expr.getReturnType(context, argument);
                const parameterType = parameter.type;

                let valid = false;

                // Regular type check
                valid = valid || (Type.canAssignTo(context, argumentType, parameterType));

                // In-place construction
                valid = valid || (
                    Flags.has(parameter.flags, DeclVariableFlags.Owns) &&
                    Type.canAssignTo(context, argumentType, CreateConstructorType(context, parameterType))
                );

                if (!valid) {
                    context.error(new IncorrectTypeError(context, argumentId, argumentType, parameterId, parameterType, argumentId));
                }
            }

            return node;
        }
            
        case Tag.ExprConstant: {
            // No check required
            return node;
        }
            
        case Tag.ExprCreate: {
            //console.error("Not supported yet");
            return node;
        }

        case Tag.ExprDeclaration: {
            // No check required
            return node;
        }
            
        case Tag.ExprDestroy: {
            // No check required
            return node;
        }

        case Tag.ExprGet: {
            // No check required
            return node;
        }
            
        case Tag.ExprIf: {
            // No check required
            return node;
        }

        case Tag.ExprIfCase: {
            if (node.condition !== null) {
                const condition = context.get(node.condition);
                const type = Expr.getReturnType(context, condition);

                if (!isType(context, type, 'bool')) {
                    context.error(new TypeErrors.ConditionNotBoolean(context, id, node.condition));
                }
            }

            return node;
        }
            
        case Tag.ExprMove: {
            // No check required
            return node;
        }
            
        case Tag.ExprSet: {
             const source = context.get(node.value);
             const sourceType = Expr.getReturnType(context, source);
             const target = context.get(node.target) as DeclVariable;

             if (!Type.canAssignTo(context, sourceType, target.type)) {
                 context.error(new IncorrectTypeError(context, node.value, sourceType, node.target, target.type, id));
             }

             return node;
        }
            
        case Tag.ExprReturn: {
            const ref = context.container.self;
            const fn = Node.as(context.get(ref), DeclFunction);

            if (node.value === null) {
                if (!isType(context, fn.returnType, 'void')) {
                    context.error(new TypeErrors.ReturnValue(context, ref));
                }
            } else {
                const returnType = Expr.getReturnType(context, node);

                if (!Type.canAssignTo(context, returnType, fn.returnType)) {
                    context.error(new TypeErrors.ReturnValue(context, ref, node.value));
                }
            }

            return node;
        }
            
        case Tag.ExprWhile: {
            const condition = context.get(node.condition);
            const type = Expr.getReturnType(context, condition);

            if (!isType(context, type, 'bool')) {
                context.error(new TypeErrors.ConditionNotBoolean(context, id, node.condition));
            }

            return node;
        }
    }

    return node;
});

// TODO: This works by looking up the name of the type - switch to a direct reference of the type
function isType(context: Context, type: Type, name: string) {
    switch (type.tag) {
        case Tag.TypeGet: {
            const target = Node.as(context.get(type.target), DeclStruct);

            return target.name === name;
        }

        default: {
            return false;
        }
    }

    throw unreachable(type);
}

function CreateConstructorType(context: Context, type: Type): Type {
    const ids = context.container.names.get('constructor');

    if (ids === undefined) {
        throw new Error(`Internal Error: Could not find builtin type 'constructor'`);
    }

    return new TypeGenericApply(new TypeGet(new RefGlobal(ids[0])), [type]);
}
