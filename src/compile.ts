import * as nearley from "nearley";
import Analyzer from './analysis';
import { Scope } from './ast/scope';
import { Function, Tag, Thing, Type } from './ast/things';
import { Source } from './common/source';
import { CompilerError, ConsoleErrorFormatter } from './errors';
import { Main } from './parser/ast_builders';
import Grammar from './parser/grammar';
import { convert } from './parser/node2thing';
import { Parser } from './parser/parser';
import Polymorpher from './polymorph';
import TargetCGcc from './targets/c';
import { registerIntrinsics, removeIntrinsics } from './targets/c/intrinsics';
import TypeChecker from './type_check';

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

        if(parser.results.length == 0){
            console.error("Incomplete parse")

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

        //const parser = new Parser();

        // console.log(results);

        // Ast Generation
        console.time("ast-generation");
        for(let index = 0; index < results.length; index += 2){
            const node = results[index];

            const output = Main.parse(node);

            if(output === null){
                throw new Error("Broken Assertion: Output of Parser.parse shouldn't be null if the input isn't null");
            }

            convert(compiler, compiler.scope, output);
        }
        console.timeEnd("ast-generation");

        removeIntrinsics(compiler);
    }
}

class TypeCheck {
    public execute(compiler: Compiler){
        const astGeneration = new AstGeneration();
        astGeneration.execute(compiler);

        // Type check
        console.time("type-checking");
        const checker = new TypeChecker(compiler);
        const state = new TypeChecker.State();
        for(const type of compiler.scope.typeNameMap.values()){
            checker.check(type, state);
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
        const state = new Analyzer.State();
        for(const type of compiler.scope.typeNameMap.values()){
            analyser.check(type, state);
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
        const state = new Polymorpher.State();
        for(const type of compiler.scope.typeNameMap.values()){
            const morphed = polymorpher.polymorph(type, state);

            if(morphed.tag === Tag.Function){
                compiler.scope.typeNameMap.set(morphed.name, morphed);
                compiler.scope.functionNameMap.set(morphed.name, morphed);
            }
        }
        console.timeEnd("monomorphize");

    }
}

class CodeGen {
    public execute(compiler: Compiler){
        const monomorphize = new Monomorphize();
        monomorphize.execute(compiler);

        let output = "";

        // Code-gen
        console.time("code-gen");
        if(compiler.errors.length === 0){
            const target = new TargetCGcc();

            target.compileModule(compiler.scope);

            output = target.output.join("");
        }
        console.timeEnd("code-gen");

        return output;
    }
}


export class Compiler {
    // TODO: Refactor this out
    public readonly scope: Scope;
    public readonly types: {
        string: Type,
        int: Type,
        none: Type,
    };
    public readonly functions: {
        copy: Function,
        move: Function,
    };

    constructor(){
        this.scope = new Scope('F');
        const result = registerIntrinsics(this);
        this.types = result.types;
        this.functions = result.functions;
    }

    // TODO: Refactor actions so that this doesn't have to be public
    public errors = new Array<CompilerError>();

    public report(error: CompilerError) {
        const formatter = new ConsoleErrorFormatter();
        error.format(formatter, this);
        this.errors.push(error);
    }

    public parse<T = Thing>(node: any, scope: Scope): (T | null) {
        const parser = new Parser();
        const res = parser.parse(node) as any;
        return res;
    }

    public compile(source: Source){
        (this as any).source = source;

        const codegen = new CodeGen();
        const output = codegen.execute(this);
        
        //if(this.errors.length > 0){
        //    while(this.errors.length > 0){
        //        this.errors.pop()?.format(new ConsoleErrorFormatter(), this);
        //    }
        //    return null;
        //}

        return output;
    }
}