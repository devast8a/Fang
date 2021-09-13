import * as Fs from 'fs';
import { AstGenerationStage } from "./stages/AstGenerationStage";
import { Module, Node, Tag } from './nodes';
import { ParseStage } from './stages/ParseStage';
import { Source } from './common/source';
import { builtin } from './Builtin';
import { checkLifetime } from './stages/checkLifetime';
import { checkType } from './stages/checkType';
import { nameResolution } from './stages/nameResolution';
import { transformInferType } from './stages/transformInferType';
import { TargetC } from './stages/targetC';
import { transformRemoveNesting } from './stages/transformRemoveNesting';
import { TransformExecuteMacroStage } from './stages/transfromExecuteMacro';
import { transformInstantiate } from './stages/transformInstantiate';
import { markAbstractFunctions } from './stages/markAbstractFunctions';
import { nameMangle } from './stages/nameMangle';

export interface Stage {
    name: string;
    execute(compiler: Compiler, nodes: Node[], source: Source): Node[];
}

export class Compiler {
    private stages: Stage[] = [
        new ParseStage(),
        new AstGenerationStage(),
        new TransformExecuteMacroStage(),
    ];

    public async parseFile(source: string | Source): Promise<Node[]>
    {
        if (!(source instanceof Source)) {
            source = new Source(source, await Fs.promises.readFile(source, "utf8"));
        }
        
        console.group(`Parsing ${source.path}`);
        console.time(`${source.path} Total`);

        let nodes = new Array<Node>();
        for (const stage of this.stages) {
            console.time(`${source.path} ${stage.name}`);
            nodes = stage.execute(this, nodes, source);
            console.timeEnd(`${source.path} ${stage.name}`);
        }

        console.timeEnd(`${source.path} Total`);
        console.groupEnd();

        return nodes;
    }

    public async compile(source: string | Source): Promise<string>
    {
        const module = new Module([]);

        console.time("Total");
        let nodes = await this.parseFile(source);

        console.time(`Name Resolution`);
        const scope = builtin.scope.newChildScope();
        nameResolution(nodes, scope);
        console.timeEnd(`Name Resolution`);

        console.time(`Transform>Infer Types`);
        transformInferType.array(nodes, nodes[0], null);
        console.timeEnd(`Transform>Infer Types`);

        console.time(`Check>Types`);
        //checkType.array(nodes, null);
        console.timeEnd(`Check>Types`);

        console.time(`Check>Lifetime`);
        checkLifetime(nodes);
        console.timeEnd(`Check>Lifetime`);

        nameMangle.array(nodes, nodes[0], null);

        console.time(`Transform > Mark Abstract Functions`);
        markAbstractFunctions.array(nodes, nodes[0], null);
        console.timeEnd(`Transform > Mark Abstract Functions`);

        console.time(`Transform>Remove Nesting`);
        transformRemoveNesting(nodes);
        console.timeEnd(`Transform>Remove Nesting`);

        console.time(`Transform > Instantiate`);
        const extra = new Array<Node>();
        nodes = transformInstantiate.array(nodes, nodes[0], {
            topLevel: extra,
            module: module,
        });
        nodes = nodes.concat(extra);
        console.timeEnd(`Transform > Instantiate`);

        const target = new TargetC();

        target.emitProgram(nodes);

        console.timeEnd("Total");
        return target.toString();
    }

    public static async compile(path: string) {
        const compiler = new Compiler();
        const source = new Source(
            path,
            await Fs.promises.readFile(path, 'utf8')
        );

        return compiler.compile(source);
    }
}