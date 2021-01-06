import { RDeclClass } from './RDeclClass';
import { RDeclFunction } from './RDeclFunction';
import { RDeclTrait } from './RDeclTrait';
import { RDeclVariable } from './RDeclVariable';
import { RGeneric } from './RGeneric';
import { RGenericApply } from './RGenericApply';
import { RGenericParameter } from './RGenericParameter';
import { RNode } from './RNode';
import { RTag } from './RTag';

export type RType =
    | RDeclClass
    | RDeclFunction
    | RDeclTrait
    | RDeclVariable
    | RGeneric<RType>
    | RGenericApply<RType>
    | RGenericParameter<RType>
    ;

/**
 * I suspect there is going to be some need to separate functions and function types
 */

export namespace RType {
    // Returns true if child is a subtype of parent (or child is parent)
    export function isSubType(child: RType, parent: RType, context?: Context): boolean {
        if (child === parent) {
            return true;
        }

        if (context === undefined) {
            context = new Context();
        }

        switch (child.tag) {
            // Classes
            case RTag.DeclClass: {
                switch (parent.tag) {
                    case RTag.DeclClass: { return false; }
                    case RTag.DeclTrait: { return child.superTypes.some(child => RType.isSubType(child, parent, context)); }
                }

                break;
            }

            // Traits
            case RTag.DeclTrait: {
                switch (parent.tag) {
                    case RTag.DeclClass: { return false; }
                    case RTag.DeclTrait: { return false; } // This should actually be the same as DeclClass
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

    // Returns true if parent is a supertype of child (or parent is child)
    export function isSuperType(parent: RType, child: RType, context?: Context) {
        return RType.isSubType(child, parent, context);
    }

    export function getMember(type: RType, member: string, context?: Context): RType | null {
        throw new Error(`Unhandled type=${RTag[type.tag]}`);
    }

    export class Context {
        private readonly _generics = new Array<RGeneric<RNode>>();
        public readonly generics: ReadonlyArray<RGeneric<RNode>> = this._generics;

        private readonly _arguments = new Array<ReadonlyArray<RType>>();
        public readonly arguments: ReadonlyArray<ReadonlyArray<RType>> = this._arguments;

        public push(apply: RGenericApply<RNode>) {
            this._generics.push(apply.generic);
            this._arguments.push(apply.args);
        }

        public pop() {
            this._generics.pop();
            this._arguments.pop();
        }

        public resolve(parameter: RType) {
            let index = this._generics.length - 1;

            while (parameter.tag === RTag.GenericParameter) {
                while (index >= 0 && this._generics[index] !== parameter.generic) {
                    index--;
                }

                if (index < 0) {
                    break;
                }

                parameter = this._arguments[index][parameter.index];
            }

            return parameter;
        }
    }
}


