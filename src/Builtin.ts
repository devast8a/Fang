import { RNodes } from './nodes/resolved/RNode';
import { RType } from './nodes/resolved/RType';

export interface Builtin {
    types: {
        bool: RType;
        s32: RType;
        str: RType;
    };
}

export const builtin: Builtin = {
    types: {
        bool: new RNodes.DeclClass("bool"),
        s32:  new RNodes.DeclClass("s32"),
        str:  new RNodes.DeclClass("str"),
    }
};
