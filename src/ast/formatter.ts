import { unimplemented } from '../utils';
import { Ctx } from './context';
import { Distance, Ref, Tag } from './nodes';

export function formatNode(ctx: Ctx, ref: Ref, declaration = false): string {
    if (typeof ref.target !== 'number') {
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

export function formatDistance(ref: Ref) {
    switch (ref.distance) {
        case Distance.Global:   return `^G`;
        case Distance.Local:    return ``;
        case Distance.Unknown:  return `^?`;
        default:                return `^${ref.distance}`;
    }
}

export function formatRef(ctx: Ctx, ref: Ref): string {
    const distance = formatDistance(ref);

    const object = ref.object === null ? '' : formatNode(ctx, ref.object) + '.';

    switch (typeof ref.target) {
        case 'number': {
            const node = ctx.nodes[ref.target];
            const name = (node as any).name ?? '<unnamed>';
            return `${object}${name}[${ref.target}${distance}]`
        }

        case 'string': {
            const dist = ref.distance === Distance.Unknown ? '' : distance;
            return `${object}${ref.target}[?${dist}]`;
        }
    }

    // HACK
    if (ref.target as any instanceof Ref) {
        const target = formatNode(ctx, ref.target as any);
        return `${object}%[${target}]`;
    }

    throw unimplemented('Unable to format Ref')
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