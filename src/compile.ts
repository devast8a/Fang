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
import { resolveOverload } from './stages/resolveOverload';
import { resolveNodes } from './stages/nodeResolution';

export interface Stage {
    name: string;
    execute(compiler: Compiler, nodes: Node[], source: Source): Node[];
}

function instantiate(nodes: Node[]) {
    const module = new Module([]);
    const extra = new Array<Node>();
    nodes = transformInstantiate.array(nodes, nodes[0], {
        topLevel: extra,
        module: module,
    });
    return nodes.concat(extra);
}

export class Compiler {
    private parseStages: Stage[] = [
        new ParseStage(),
        new AstGenerationStage(),
        new TransformExecuteMacroStage(),
    ];

    private compileStages: Stage[] = [
        {name: "Symbol Resolution",   execute: (compiler, nodes, source) => {nameResolution(nodes, builtin.scope.newChildScope()); return nodes; }},
        {name: "Type Inference",      execute: (compiler, nodes, source) => transformInferType.array(nodes, nodes[0], null)},
        {name: "Node Resolution",     execute: (compiler, nodes, source) => resolveNodes.array(nodes, nodes[0], null)},
        {name: "Overload Resolution", execute: (compiler, nodes, source) => resolveOverload.array(nodes, nodes[0], null)},
        {name: "Type Check",          execute: (compiler, nodes, source) => checkType.array(nodes, nodes[0], null)},
        {name: "Lifetime Check",      execute: (compiler, nodes, source) => {checkLifetime(nodes); return nodes;}},
        {name: "Symbol Mangling",     execute: (compiler, nodes, source) => nameMangle.array(nodes, nodes[0], null)},
        {name: "Mark Abstract",       execute: (compiler, nodes, source) => markAbstractFunctions.array(nodes, nodes[0], null)},
        {name: "Remove Nesting",      execute: (compiler, nodes, source) => {transformRemoveNesting(nodes); return nodes;}},
        {name: "Instantiation",       execute: (compiler, nodes, source) => instantiate(nodes)},
    ];

    public async parseFile(source: string | Source): Promise<Node[]>
    {
        if (!(source instanceof Source)) {
            source = new Source(source, await Fs.promises.readFile(source, "utf8"));
        }
        
        console.group(`Parsing ${source.path}`);
        console.time(`${source.path} Total`);

        let nodes = new Array<Node>();
        for (const stage of this.parseStages) {
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
        console.group(`Compiling`);
        console.time("Total");

        let nodes = await this.parseFile(source);

        for (const stage of this.compileStages) {
            console.time(stage.name);
            nodes = stage.execute(this, nodes, undefined as any);
            console.timeEnd(stage.name);
        }

        const target = new TargetC();
        target.emitProgram(nodes);
        const program = target.toString();

        console.timeEnd("Total");
        console.groupEnd();

        return program;
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