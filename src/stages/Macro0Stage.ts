// Executes macros before the name resolution stage

import { Source } from '../common/source';
import { Compiler } from '../compile';
import { RNode } from '../nodes/resolved/RNode';

type Macro = (compiler: Compiler, node: RNode) => Promise<void>;

//  This is primarily used by things like "import"
export class Macro0Stage {
    private readonly macros = new Map<string, Macro>();

    public constructor() {
        this.macros.set("import", async (compiler, node) => {
            await compiler.parseFile("examples/bar.fang");
        });
    }

    public async execute(compiler: Compiler, nodes: RNode[], source: Source) {
        // Find any macro calls at the highest level
        for (const node of nodes) {
            //
        }
    }
}