import { unimplemented, unreachable } from '../utils';
import { Ctx } from './context';
import { Distance, Ref, RefType, Tag } from './nodes';

export function formatNode(ctx: Ctx, ref: Ref, declaration = false): string {
    if (ref.type !== RefType.Id) {
        return formatRef(ctx, ref);
    }
    const node = ctx.get(ref);

    switch (node.tag) {
        case Tag.BlockAttribute: {
            const target = formatRef(ctx, node.target);

            return `##${target}`;
        }
            
        case Tag.Break: {
            return `break`;
        }
            
        case Tag.Call: {
            const target = formatNode(ctx, node.target);
            const args   = formatNodes(ctx, node.args, {join: ', ', declaration: false});

            return `${target}(${args})`;
        }

        case Tag.Constant: {
            return JSON.stringify(node.value);
        }
            
        case Tag.Construct: {
            const target = formatNode(ctx, node.target);
            const args   = formatNodes(ctx, node.args, {join: ', ', declaration: false});

            return `${target}{${args}}`;
        }
            
        case Tag.Function: {
            if (!declaration) return formatRef(ctx, ref);

            const name = `${node.name}[#${node.id}]`;
            const ps   = formatNodes(ctx, node.parameters, { join: ', ' });
            const body = formatNodes(ctx, node.body, { indented: true });

            return `fn ${name} (${ps}) {${body}}`;
        }

        case Tag.ForEach: {
            const element    = formatNode(ctx, node.element);
            const collection = formatNode(ctx, node.collection);
            const body       = formatNodes(ctx, node.body, {indented: true});

            return `for ${element} in ${collection} {${body}}`;
        }
            
        case Tag.Get: {
            return formatRef(ctx, node.source);
        }

        case Tag.If: {
            const cond = formatNode(ctx, node.cases[0].condition!);
            const body = formatNodes(ctx, node.cases[0].body, {indented: true});

            return `if ${cond} {${body}}`;
        }

        case Tag.Return: {
            const value = node.value === null ? '' : formatNode(ctx, node.value);

            return `return ${value}`;
        }

        case Tag.Set: {
            const target = formatNode(ctx, node.target);
            const source = formatNode(ctx, node.source);

            return `${target} = ${source}`;
        }

        case Tag.Struct: {
            if (!declaration) return formatRef(ctx, ref);

            const body = formatNodes(ctx, node.body, {indented: true});
            const name = `${node.name}[#${node.id}]`;

            return `struct ${name} {${body}}`;
        }

        case Tag.Trait: {
            if (!declaration) return formatRef(ctx, ref);

            const body = formatNodes(ctx, node.body, {indented: true});
            const name = `${node.name}[#${node.id}]`;

            return `trait ${name} {${body}}`;
        }

        case Tag.Variable: {
            if (!declaration) return formatRef(ctx, ref);

            const name = `${node.name}[#${node.id}]`;

            return `val ${name}`;
        }

        case Tag.While: {
            const cond = formatNode(ctx, node.condition)
            const body = formatNodes(ctx, node.body, {indented: true});

            return `while ${cond} {${body}}`;
        }

        default: {
            return `[${Tag[node.tag]}]`;
        }
    }
}

export function formatDistance(ctx: Ctx, ref: Ref) {
    switch (ref.type) {
        case RefType.Id:
        case RefType.Ids:
            switch (ref.distance) {
                case Distance.Global: return `^G`;
                case Distance.Local:  return ``;
                default:              return `^${ref.distance}`
            }

        case RefType.Expr:
        case RefType.Infer:
        case RefType.Name:
            return ``;
    }
}

export function formatRef(ctx: Ctx, ref: Ref): string {
    const object = ref.object === null ? '' : formatNode(ctx, ref.object) + '.';
    const distance = formatDistance(ctx, ref);

    switch (ref.type) {
        case RefType.Expr: {
            const target = formatNode(ctx, ref.values[0]);
            return `${object}[${target}]`;
        }

        case RefType.Id: {
            const target = (ctx.get(ref) as any).name ?? '<anonymous>';
            return `${object}${target}[${ref.id}${distance}]`;
        }

        case RefType.Ids: {
            const target = (ctx.get(ref) as any).name ?? '<anonymous>';
            return `${object}${target}[${ref.ids.join(',')}${distance}]`;
        }

        case RefType.Infer: {
            return `${object}<infer>`;
        }

        case RefType.Name: {
            return `${object}${ref.name}[?]`;
        }
    }
    throw unreachable(ref);
}

interface Options {
    indented?: boolean;
    join?: string;
    declaration?: boolean;
}

export function formatNodes(ctx: Ctx, nodes: readonly Ref[], options?: Options) {
    const {
        declaration,
        indented,
        join,
    } = Object.assign({
        declaration: true,
        indented: false,
        join: '\n',
    }, options);

    const result = nodes.map(ref => formatNode(ctx, ref, declaration)).join(join);
    return indented ? indent(result) : result;
}

function indent(string: string) {
    if (string === '') {
        return '';
    }

    return '\n    ' + string.replace(/\n/g, '\n    ') + '\n'
}