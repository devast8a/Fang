import { RNode, RNodes } from '../nodes/resolved/RNode';
import { RTag } from '../nodes/resolved/RTag';
import { RType } from '../nodes/resolved/RType';
import { Scope } from './Scope';

export class NameResolutionStage {
    private scopeMap = new Map<RNode, Scope>();

    public execute(nodes: RNode[]) {
        const scope = new Scope();
        this.declare(nodes, scope);
        return this.resolve(nodes);
    }

    private declare(nodes: RNode | RNode[], scope: Scope) {
        if (nodes instanceof Array) {
            for (const node of nodes) {
                this.declare(node, scope);
            }
            return;
        }
        const node = nodes;

        this.scopeMap.set(node, scope);

        switch (node.tag) {
            case RTag.DeclClass: {
                scope.declare(node.name, node);

                const childScope = scope.newChildScope();
                this.declare(node.superTypes, childScope);
                this.declare(node.members, childScope);
                break;
            }

            case RTag.DeclFunction: {
                scope.declare(node.name, node);

                const childScope = scope.newChildScope();
                this.declare(node.parameters, childScope);
                this.declare(node.returnType, childScope);
                this.declare(node.body, childScope);
                break;
            }

            case RTag.DeclTrait: {
                scope.declare(node.name, node);

                const childScope = scope.newChildScope();
                this.declare(node.superTypes, childScope);
                this.declare(node.members, childScope);
                break;
            }

            case RTag.DeclVariable: {
                scope.declare(node.name, node);

                this.declare(node.type, scope);
                if (node.value !== null) { this.declare(node.value, scope); }
                break;
            }

            case RTag.UExprCall: {
                this.declare(node.target, scope);
                this.declare(node.args, scope);
                break;
            }

            case RTag.UExprAtom: {
                break;
            }

            case RTag.TypeAtom: {
                break;
            }

            default: {
                throw new Error(`Unknown node ${RTag[(node as any).tag]} (declare)`);
            }
        }
    }

    private resolve<T extends RNode>(nodes: T): T
    private resolve<T extends RNode>(nodes: T[]): T[]
    private resolve<T extends RNode>(nodes: T | T[]) {
        if (nodes instanceof Array) {
            return nodes.map(node => this.resolve(node));
        }
        const node = (nodes as RNode);

        switch (node.tag) {
            case RTag.DeclClass: {
                node.superTypes = this.resolve(node.superTypes);
                node.members    = this.resolve(node.members);
                return node;
            }

            case RTag.DeclFunction: {
                node.parameters = this.resolve(node.parameters);
                node.returnType = this.resolve(node.returnType);
                node.body       = this.resolve(node.body);
                return node;
            }

            case RTag.DeclVariable: {
                node.type       = this.resolve(node.type);
                return node;
            }

            case RTag.DeclTrait: {
                return node;
            }

            case RTag.UExprCall: {
                const target = node.target;
                const args = this.resolve(node.args);

                switch (target.tag) {
                    case RTag.UExprAtom: {
                        const fn = this.scopeMap.get(target)!.lookup(target.name) as any;
                        return new RNodes.ExprCallStatic(fn, this.resolve(node.args) as any);
                    }

                    default: {
                        throw new Error(`Unknown node ${RTag[(target as any).tag]} (resolve)`);
                    }
                }
            }

            case RTag.UExprAtom: {
                const variable = this.scopeMap.get(node)!.lookup(node.name) as any;
                return new RNodes.ExprGetLocal(variable);
            }

            case RTag.TypeAtom: {
                const scope = this.scopeMap.get(node)!;
                node.type   = scope.lookup(node.name) as RType;
                return node;
            }

            default: {
                throw new Error(`Unknown node ${RTag[(node as any).tag]} (resolve)`);
            }
        }
    }

}