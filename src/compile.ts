import * as Fs from 'fs';
import { AstGenerationStage } from "./stages/AstGenerationStage";
import { Module, Node } from './nodes';
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
import { ParserStage } from './stages/ParseStage';

export interface ParseContext {
    source: Source;
    module: Module;
}

export interface ParseStage {
    name: string;
    execute(compiler: Compiler, nodes: Node[], context: ParseContext): Node[];
}

export interface CompileStage {
    name: string;
    execute(compiler: Compiler, nodes: Node[], module: Module): Node[];
}


function instantiate(nodes: Node[], module: Module) {
    const extra = new Array<Node>();
    nodes = transformInstantiate.array(nodes, nodes[0], {
        topLevel: extra,
        module: module,
    });
    return nodes.concat(extra);
}

export class Compiler {
    private parseStages: ParseStage[] = [
        new ParserStage(),
        new AstGenerationStage(),
        new TransformExecuteMacroStage(),
    ];

    private compileStages: CompileStage[] = [
        {name: "Symbol Resolution",   execute: (compiler, nodes, module) => {nameResolution(nodes, builtin.scope.newChildScope()); return nodes; }},
        {name: "Type Inference",      execute: (compiler, nodes, module) => transformInferType.array(nodes, nodes[0], null)},
        {name: "Node Resolution",     execute: (compiler, nodes, module) => resolveNodes.array(nodes, nodes[0], null)},
        {name: "Overload Resolution", execute: (compiler, nodes, module) => resolveOverload.array(nodes, nodes[0], null)},
        {name: "Type Check",          execute: (compiler, nodes, module) => checkType.array(nodes, nodes[0], null)},
        {name: "Lifetime Check",      execute: (compiler, nodes, module) => {checkLifetime(nodes); return nodes;}},
        {name: "Symbol Mangling",     execute: (compiler, nodes, module) => nameMangle.array(nodes, nodes[0], null)},
        {name: "Mark Abstract",       execute: (compiler, nodes, module) => markAbstractFunctions.array(nodes, nodes[0], null)},
        {name: "Remove Nesting",      execute: (compiler, nodes, module) => {transformRemoveNesting(nodes); return nodes;}},
        {name: "Instantiation",       execute: (compiler, nodes, module) => instantiate(nodes, module)},
    ];

    public async parseFile(source: string | Source, module: Module): Promise<Node[]>
    {
        if (!(source instanceof Source)) {
            source = new Source(source, await Fs.promises.readFile(source, "utf8"));
        }
        
        console.group(`Parsing ${source.path}`);
        console.time(`${source.path} Total`);

        let nodes = new Array<Node>();
        for (const stage of this.parseStages) {
            console.time(`${source.path} ${stage.name}`);
            nodes = stage.execute(this, nodes, {source, module});
            console.timeEnd(`${source.path} ${stage.name}`);
        }

        console.timeEnd(`${source.path} Total`);
        console.groupEnd();

        return nodes;
    }

    public async compile(source: string | Source): Promise<string>
    {
        const module = new Module([], []);

        console.group(`Compiling`);
        console.time("Total");

        let nodes = await this.parseFile(source, module);

        for (const stage of this.compileStages) {
            console.time(stage.name);
            nodes = stage.execute(this, nodes, module);
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