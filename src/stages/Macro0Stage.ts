// Executes macros before the name resolution stage

import { Source } from '../common/source';
import { Compiler } from '../compile';
import { UNode } from '../nodes/unresolved/UNode';
import { UTag } from '../nodes/unresolved/UTag';

type Macro = (compiler: Compiler, node: UNode) => Promise<void>;

//  This is primarily used by things like "import"
export class Macro0Stage {
    private readonly macros = new Map<string, Macro>();

    public constructor() {
        this.macros.set("import", async (compiler, node) => {
            await compiler.parseFile("examples/bar.fang");
        });
    }

    public async execute(compiler: Compiler, nodes: UNode[], source: Source) {
        // Find any macro calls at the highest level
        for (const node of nodes) {
            if (node.tag === UTag.ExprMacroCall) {
                const macro = this.macros.get(node.target);

                if (macro === undefined) {
                    continue;
                }

                await macro(compiler, node);
            }
        }
    }
}