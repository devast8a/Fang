import { Scope } from '../ast/scope';
import { Compiler } from '../compile';
import { UTag } from "../nodes/unresolved/UTag";
import { UNode } from "../nodes/unresolved/UNode";
import * as Things from './../ast/things';

/**
 * Current as of 020-12-27 - devast8a
 * Converts from Parser Nodes to older AST Things
 *  Currently AST Things are aware of parsing and name resolution steps within the compiler.
 *  To support using symbols declared in the future, the plan is to transition AST Things away from
 *  the these responsibilities and have it only deal with code that has been completely parsed and
 *  its names resolved. Those responsibilities will instead be managed by the newer Parser Nodes.
 *  In the meantime this provides compatibility between these two systems.
 */

const UNKNOWN: any = undefined;
const AST: any = undefined;

export function convert(compiler: Compiler, scope: Scope, node: UNode) {
    switch (node.tag) {
        case UTag.DeclClass: {
            const thing = new Things.Class(AST, node.name, "struct " + scope.id + node.name, scope);

            for (const superType of node.superTypes) {
                const type = scope.lookupType(superType as any);

                if (type === undefined) {
                    console.log(type);
                    throw new Error("Could not find type");
                } else if (type.tag !== Things.Tag.Trait) {
                    throw new Error("Type is not correct tag");
                } else {
                    thing.superTypes.push(type);
                }
            }
            
            scope.declareClass(thing);

            return thing;
        }

        case UTag.DeclFunction: {
            // TODO: Support setting function names directly through attributes
            let id = node.name;
            if (scope.id !== 'F' || node.name !== 'main') {
                id = scope.id + node.name;
            }

            // TODO: Remove placeholder type
            const returnType = scope.lookupType("Int")!;

            const thing = new Things.Function(AST, node.name, id, returnType, scope);

            scope.declareFunction(thing);

            for (const parameter of node.parameters) {
                thing.parameters.push(convert(compiler, thing.scope, parameter) as Things.Variable);
            }

            for (const stmt of node.body) {
                thing.body.block.push(convert(compiler, thing.scope, stmt) as Things.Stmt);
            }

            return thing;
        }

        case UTag.DeclParameter: {
            const type = scope.lookupType(node.type as any)!; // TODO: Remove type system subversion
            const thing = new Things.Variable(AST, node.name, type, node.flags, node.name);
            scope.declareVariable(thing);
            return thing;
        }

        case UTag.DeclTrait: {
            const thing = new Things.Trait(AST, node.name, "struct " + scope.id + node.name, scope);

            for (const superType of node.superTypes) {
                const type = scope.lookupType(superType as any);

                if (type === undefined) {
                    throw new Error("Could not find type");
                }

                thing.traits.set(type.id, type as any);
            }
            
            scope.declareTrait(thing);

            return thing;
        }

        case UTag.DeclVariable: {
            const type  = scope.lookupType(node.type as any); // TODO: Remove type system subversion

            if (type === undefined) {
                throw new Error(`Could not find a type with the name ${node.type}`); // TODO: Hook everything into a compiler error system
            }

            // TODO: Correctly set variable flags based on keyword used when declaring a variable
            const flags = Things.VariableFlags.Local;

            const thing = new Things.Variable(AST, node.name, type, flags, node.name);

            scope.declareVariable(thing);

            return new Things.SetVariable(AST, thing, new Things.Constant(AST, type, 100));
        }

        case UTag.ExprCall: {
            // TODO: Remove placeholder function
            const thing = new Things.CallStatic(AST, scope.lookupFunction("test")!);

            for (const arg of node.args) {
                thing.arguments.push(convert(compiler, scope, arg) as Things.Expr);
            }

            return thing;
        }

        case UTag.ExprGet: {
            const variable = scope.lookupVariable(node.name)!;
            const thing    = new Things.GetVariable(AST, variable);

            return thing;
        }

        default: {
            throw new Error(`Unable to convert node ${UTag[(node as any).tag]}`);
        }
    }
}