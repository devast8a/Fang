import chalk from "chalk";
import * as fs from "fs";
import * as nearley from "nearley";
import 'source-map-support/register';
import { CallStatic, Class, Function, Scope, Thing, Variable, Stmt, Type, Tag, Expr, GetField, VariableFlags } from './ast';
import TargetCGcc from './codegen';
import { Tag as AstTag } from './parser/post_processor';
import { TypeChecker } from './type_check';
import Polymorpher from './polymorph';
import { Analyzer } from './analysis';
import { CompilerError } from './errors';
import Grammar from './parser/grammar';

class Source {
    public constructor(path: string, content: string){
        this.path = path;
        this.content = content;
    }

    public static async fromFile(path: string){
        const content = await fs.promises.readFile(path, "utf8");
        return new Source(path, content);
    }

    public path: string;
    public content: string;
}

class Parse {
    public execute(compiler: Compiler){
        // TODO: Properly load source
        const source = (compiler as any).source as Source;

        // Parse
        console.time("parsing");
        const parser = new nearley.Parser(Grammar);
        parser.feed(source.content);
        console.timeEnd("parsing");

        if(parser.results.length > 1){
            console.error("! AMBIGUOUS GRAMMAR !");
            console.log(JSON.stringify(parser.results[0], null, 4));
            console.log(JSON.stringify(parser.results[1], null, 4));
            console.log(parser.results.length);

            // TODO: Remove this kludge
            throw new Error();
        }

        return parser.results[0];
    }
}

class AstGeneration {
    public execute(compiler: Compiler){
        const parse = new Parse();
        const results = parse.execute(compiler);

        // Ast Generation
        console.time("ast-generation");
        for(const node of results){
            compiler.parse(node, compiler.scope);
            // this.parse(node, this.scope);
        }
        console.timeEnd("ast-generation");

        // TODO: Remove hack to avoid outputting compiler defined functions
        compiler.scope.types.delete("none");
        compiler.scope.types.delete("str");
        compiler.scope.types.delete("int");
        compiler.scope.types.delete("writeLn");
        compiler.scope.types.delete("$infix+");
        compiler.scope.functions.delete("writeLn");
        compiler.scope.functions.delete("$infix+");
        compiler.scope.functions.delete("copy");
        compiler.scope.functions.delete("move");
    }
}

class TypeCheck {
    public execute(compiler: Compiler){
        const astGeneration = new AstGeneration();
        const scope = astGeneration.execute(compiler);

        // Type check
        console.time("type-checking");
        const checker = new TypeChecker(compiler);
        for(const type of compiler.scope.types.values()){
            checker.check(type);
            //type.checkTypes(this);
        }
        console.timeEnd("type-checking");

    }
}

class Analyze {
    public execute(compiler: Compiler){
        const typeCheck = new TypeCheck();
        typeCheck.execute(compiler);

        // Analysis
        console.time("analysis");
        const analyser = new Analyzer(compiler);
        for(const type of compiler.scope.types.values()){
            analyser.check(type);
        }
        console.timeEnd("analysis");

    }
}

export class Monomorphize {
    public execute(compiler: Compiler){
        const analyze = new Analyze();
        analyze.execute(compiler);

        // Monomorphize
        console.time("monomorphize");
        const polymorpher = new Polymorpher(compiler, compiler.scope);
        for(const type of compiler.scope.types.values()){
            let morphed = polymorpher.polymorph(type);

            if(morphed.tag === Tag.Function){
                compiler.scope.types.set(morphed.name, morphed);
                compiler.scope.functions.set(morphed.name, morphed);
            }
        }
        console.timeEnd("monomorphize");

    }
}

class Output {
    public execute(compiler: Compiler){
        const monomorphize = new Monomorphize();
        monomorphize.execute(compiler);

        // Code-gen
        console.time("code-gen");
        if(compiler.errors.length === 0){
            const target = new TargetCGcc();

            for(const thing of (compiler.scope as any).classes.values()){
                target.compileClass(thing);
            }

            for(const func of Array.from(compiler.scope.functions.values())){
                target.declareFunction(func);
            }

            for(const func of Array.from(compiler.scope.functions.values())){
                target.compileFunction(func);
            }

            const output = target.output.join("");
            fs.writeFileSync("build/test.c", output);
        }
        console.timeEnd("code-gen");

    }
}


export class Compiler {
    // TODO: Refactor this out
    public readonly scope: Scope;
    public readonly types: {
        string: Type,
        int: Type,
    };
    public readonly functions: {
        copy: Function,
        move: Function,
    };

    constructor(){
        // TODO: Support binding to target within the language itself
        // TODO: Use the actual name of the module
        const scope = this.scope = new Scope('Ftest_');

        const str = new Class("", "str", "char*", scope);
        const int = new Class("", "int", "int", scope);
        const none = new Class("", "none", "void", scope);

        scope.types.set("none", none);
        scope.types.set("str", str);
        scope.types.set("int", int);

        const f = new Function("", "writeLn", "writeLn", scope);
        f.returnType = none;
        (f as any).ffi_name = "printf";
        f.parameters.push(new Variable("", "", str, VariableFlags.None, ""));
        f.parameters.push(new Variable("", "", int, VariableFlags.None, ""));

        scope.declareFunction(f);

        scope.functions.set("$infix+", new Function("", "$infix+", "$infix+", scope));

        const copy = new Function("", "copy", "copy", scope);
        copy.parameters.push(new Variable("", "", str, VariableFlags.None, ""));
        scope.functions.set("copy", copy);

        const move = new Function("", "move", "move", scope);
        move.parameters.push(new Variable("", "", str, VariableFlags.None, ""));
        scope.functions.set("move", move);

        this.types = {
            string: str,
            int: int,
        };

        this.functions = {
            copy: copy,
            move: move,
        };
    }

    // TODO: Refactor actions so that this doesn't have to be public
    public errors = new Array<CompilerError>();

    public report(error: any) {
        this.errors.push(error);
    }

    public parse(node: any, scope: Scope): Thing{
        switch(node.tag){
            // Run the AST builders on each Nearley node
            // See: parser/ast_builders for the code that is actually run to build each AST Node
            // See: parser/post_processor for the code that wraps Nearley nodes with AST builders
            //      in particular the builder function.
            case AstTag.NODE: {
                return node.builder(node.data, this, scope);
            }

            // Ignore whitespace, this whitespace comes primarily from the whitespace between elements in statement lists.
            //  It should be removed much earlier in parsing, but we're waiting until we have a better idea how everything
            //  will pan out.
            case AstTag.WHITESPACE: {
                // TODO: Avoid subverting type system
                return undefined as any;
            }

            default: {
                throw new Error(`Unknown node tag: ${node.tag}`);
            }
        }
    }

    public compile(source: Source){
        (this as any).source = source;

        const output = new Output();
        output.execute(this);
        
        if(this.errors.length > 0){
            while(this.errors.length > 0){
                console.log(this.errors.pop());
            }
            process.exit(1);
        }
    }
};

async function main(){
    console.group("Compiling...");
    const compiler = new Compiler();
    const source = await Source.fromFile(process.argv[2]);
    compiler.compile(source);
    console.groupEnd();
}

main().catch((e) => {
    console.log(e);
    process.exit(1);
});