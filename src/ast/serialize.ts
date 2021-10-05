import { Node, Tag } from '../nodes';

export function serialize(node: Node) {
    function convert(this: any, key: string, value: any) {
        if (typeof(value) === 'object' && value !== null && value.constructor === Map) {
            const object: any = {};
            for (const [k, v] of value) {
                object[k] = v;
            }
            return object;
        }

        if (key === "tag" && typeof(value) === 'number') {
            return Tag[value] + ":" + value;
        }

        if (key === "flags" && typeof(this.tag) === 'number') {
            const self = this as Node;

            // switch (self.tag) {
            //     case Tag.DeclFunction: return convertFlags("FunctionFlags", FunctionFlags, value);
            //     case Tag.DeclVariable: return convertFlags("VariableFlags", VariableFlags, value);
            // }
        }

        return value;
    }

    return JSON.stringify(node, convert, 4);
}

interface Flags {
    [index: number]: string;
}

function convertFlags(name: string, flags: Flags, value: number) {
    let flag = 1;
    const output = [];

    while (value >= flag) {
        if ((value & flag) !== 0) {
            output.push(name + "." + flags[flag]);
        }
        flag <<= 1;
    }

    return output;
}