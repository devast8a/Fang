import { Class, Trait, Variable, Function } from '../../ast/things';
import { RDeclClass } from './RDeclClass';
import { RDeclTrait } from './RDeclTrait';
import { RGenericApply } from './RGenericApply';
import { RTag } from './RTag';

class Context {}

export type RType =
    | RGenericApply<RType>
    | RDeclClass
    | RDeclTrait
    | Class
    | Function
    | Trait
    | Variable
    ;

/**
 * I suspect there is going to be some need to separate functions and function types
 */

export namespace RType {
    export function isSubType(child: RType, parent: RType, context: Context): boolean {
        if (child === parent) {
            return true;
        }

        switch (child.tag) {
            case RTag.DeclClass: {
                switch (parent.tag) {
                    case RTag.DeclClass: { return false; }
                    case RTag.DeclTrait: { return child.superTypes.some(child => RType.isSubType(child, parent, context)); }
                }

                break;
            }

            case RTag.DeclTrait: {
                switch (parent.tag) {
                    case RTag.DeclTrait: { return false; }
                }
                break;
            }

            case RTag.DeclFunction: {
                switch (parent.tag) {
                    case RTag.DeclFunction: {
                        // TODO: Support functions with default parameters
                        // TODO: Support named parameters
                        if (child.parameters.length !== parent.parameters.length) {
                            return false;
                        }

                        if (!RType.isSubType(child.returnType, parent.returnType, context)) {
                            return false;
                        }

                        for (let index = 0; index < child.parameters.length; index++) {
                            if (!RType.isSuperType(child.parameters[index], parent.parameters[index], context)) {
                                return false;
                            }
                        }

                        return true;
                    }
                }
                break;
            }
        }

        throw new Error(`Unhandled child=${RTag[child.tag]} parent=${RTag[parent.tag]}`);
    }

    export function isSuperType(parent: RType, child: RType, context: Context) {
        return RType.isSubType(child, parent, context);
    }
}