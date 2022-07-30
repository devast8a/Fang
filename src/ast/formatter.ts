import { unimplemented } from '../utils';
import { Ctx } from './context';
import { Node, RefId, Tag } from './nodes';

export class Formatter {
    public constructor(
        private readonly ctx: Ctx,
    ) { }

    public format(ref: RefId | Node): string {
        const node: Node = ref.tag === Tag.RefId ? this.ctx.get(ref) : ref;

        switch (node.tag) {
            case Tag.BlockAttribute: {
                const target = this.formatRef(node.target);

                return `##${target}`;
            }

            case Tag.Call: {
                const target = this.formatRef(node.target);
                const args = this.formatArgs(node.args);

                return `${target}(${args})`;
            }

            case Tag.Constant: {
                return JSON.stringify(node.value);
            }      

            case Tag.ForEach: {
                const element    = this.formatRef(node.element);
                const collection = this.formatRef(node.collection);
                const body       = indent(this.formatBody(node.body));

                return `for ${element} in ${collection} {${body}}`;
            }
                
            case Tag.Function: {
                const name = node.name ?? '<anonymous>'
                const id = node.id;
                const body = indent(this.formatBody(node.body));

                return `fn ${name}[${id}]() {${body}}`;
            }

            case Tag.Get: {
                return this.formatRef(node.source);
            }

            case Tag.If: {
                return `if`;
            }

            case Tag.Return: {
                const value = node.value === null ? '<null>' : this.formatRef(node.value);

                return `return ${value}`
            }

            case Tag.Set: {
                const target = this.formatRef(node.target);
                const source = this.format(node.source);

                return `${target} = ${source}`
            }

            default: throw unimplemented(node as never);
        }
    }

    public formatRef(node: Node): string {
        switch (node.tag) {
            case Tag.Call:           return `${this.formatRef(node.target)}(${this.formatArgs(node.args)})`;
            case Tag.Constant:       return JSON.stringify(node.value);
            case Tag.Function:       return node.name ?? `<anonymous>`;
            case Tag.Get:            return `${this.formatRef(node.source)}`;
            case Tag.Variable:       return node.name;

            case Tag.RefId: {
                const targetNode = this.ctx.get(node);
                const target = this.formatRef(targetNode);

                return targetNode.tag === Tag.Get ? target : `${target}[${node.target}]`;
            }

            case Tag.RefName:        return `${node.target}[?]`;
            case Tag.RefGlobal:      return `${this.formatRef(this.ctx.get(node))}[${node.targetId}^G]`;
            case Tag.RefUpvalue:     return `${this.formatRef(this.ctx.get(node))}[${node.targetId}^${node.distance}]`;
            case Tag.RefIds:         return `${this.formatRef(this.ctx.get(node))}[${node.target.join(",")}]`;

            default: throw unimplemented(node as never);
        }
    }

    public formatBody(refs: readonly RefId[]) {
        const strings = []
        for (const ref of refs) {
            const text = this.format(this.ctx.get(ref));
            strings.push(text);
        }

        return strings.join('\n');
    }

    public formatArgs(refs: readonly RefId[]) {
        const strings = []
        for (const ref of refs) {
            const text = this.format(this.ctx.get(ref));
            strings.push(text);
        }

        return strings.join(', ');
    }
}

export function formatAst(ctx: Ctx, root: RefId[]) {
    return new Formatter(ctx).formatBody(root);
}

function indent(string: string) {
    if (string === '') {
        return '';
    }

    return '\n    ' + string.replace(/\n/g, '\n    ') + '\n'
}