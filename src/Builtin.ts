import { VariableFlags } from './nodes/resolved/RDeclVariable';
import { RNodes } from './nodes/resolved/RNode';

const empty = new RNodes.DeclClass("empty");
const bool  = new RNodes.DeclClass("bool");
const s32   = new RNodes.DeclClass("s32");
const str   = new RNodes.DeclClass("str");

const print = new RNodes.DeclFunction("print", empty, [
    new RNodes.DeclVariable("format", str, VariableFlags.Local)
]);

export const builtin = {
    types: {
        void: empty,
        bool,
        s32,
        str,
    },
    functions: {
        print,
    }
};
