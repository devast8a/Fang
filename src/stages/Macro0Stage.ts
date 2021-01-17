import { Source } from '../common/source';
import { Compiler } from '../compile';
import { RNode } from '../nodes/resolved/RNode';

type Macro = (compiler: Compiler, node: RNode) => Promise<void>;

export class Macro0Stage {
    private readonly macros = new Map<string, Macro>();

    public constructor() {
    }

    public async execute(compiler: Compiler, nodes: RNode[], source: Source) {
    }
}