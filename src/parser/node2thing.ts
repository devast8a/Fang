import { Scope } from '../ast/scope';
import { Compiler } from '../compile';
import { Node, Tag } from './ast_builders';
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

export function convert(compiler: Compiler, scope: Scope, node: Node){
    switch(node.tag){
        case Tag.DeclClass: {
            const thing = new Things.Class(AST, node.name, "struct " + scope.id + node.name, scope);
            return thing;
        }

        case Tag.DeclFunction: {
            // TODO: Support setting function names directly through attributes
            let id = node.name;
            if(scope.id !== 'F' || node.name !== 'main'){
                id = scope.id + node.name;
            }

            // TODO: Remove placeholder type
            const returnType = scope.lookupType("Int")!;

            const thing = new Things.Function(AST, node.name, id, returnType, scope);

            scope.declareFunction(thing);

            for(const stmt of node.body){
                thing.body.block.push(convert(compiler, thing.scope, stmt) as Things.Stmt);
            }

            return thing;
        }

        case Tag.DeclVariable: {
            // TODO: Remove placeholder type
            const type  = scope.lookupType("Int")!;

            // TODO: Correctly set variable flags based on keyword used when declaring a pointer
            const flags = Things.VariableFlags.Local;

            const thing = new Things.Variable(AST, node.name, type, flags, node.name);

            scope.declareVariable(thing);

            return new Things.SetVariable(AST, thing, new Things.Constant(AST, type, 100));
        }

        default: {
            throw new Error(`Unable to convert node ${Tag[(node as any).tag]}`);
        }
    }
}