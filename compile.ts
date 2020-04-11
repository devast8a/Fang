import * as nearley from "nearley";
import chalk from "chalk";
import grammar from "./grammar";
import * as fs from "fs";
import { Tag as AstTag } from './post';
import { Thing, Type, Class, Function, Variable, Scope } from './ast';
import TargetCGcc from './codegen';

// Create a Parser object from our grammar.
const compiled = nearley.Grammar.fromCompiled(grammar);

function first(data: any){return data[0];}

// Simplify our AST a bit. If our rule only has one thing it matches on,
//  don't create a new deeper set of nodes.
//
// Eg. Typically `foo -> bar bar; bar -> "A"`
//  would generate the ast [["A"], ["A"]] for the input "AA".
//  We decided to remove the extra layer of indirection, instead generating ["A", "A"]
for(const rule of compiled.rules){
    if(rule.name.indexOf('$') !== -1) {
        // Post-processors generated by Nearley rules.
        // We need to be careful about applying it to Nearley generated rules,
        //  otherwise we could break them - in particular rules that compact repetition into arrays

        // Macro calls
        if(/\$macrocall\$\d+$/.test(rule.name)){
            if(rule.postprocess !== undefined){
                // Already has a post-processor assigned
            } else if(rule.symbols.length === 1) {
                rule.postprocess = first;
            }
        }
    } else if(rule.postprocess !== undefined){
        // Already has a post-processor assigned
    } else if(rule.symbols.length === 1) {
        rule.postprocess = first;
    }
}

const parser = new nearley.Parser(compiled);

class Source {
    public constructor(path: string, content: string){
        this.path = path;
        this.content = content;
    }

    public path: string;
    public content: string;
}

function levenshteinDistance(a: string, b: string){
    return levenshteinDistance_(a, b, a.length, b.length);
}

function levenshteinDistance_(a: string, b: string, i: number, j: number): number {
    // TODO: Optimize this function
    if(Math.min(i, j) === 0){
        return Math.max(i, j);
    }

    return Math.min(
        levenshteinDistance_(a, b, i - 1, j) + 1,
        levenshteinDistance_(a, b, i, j - 1) + 1,
        levenshteinDistance_(a, b, i - 1, j - 1) + (a.charAt(i) === b.charAt(j) ? 0 : 1),
    );
}

let errors = new Array<any>();

export class Compiler {
    public error(format: string, args: string[], highlight?: any[]) {
        errors.push({
            format: format,
            args: args,
            highlight: highlight,
        });
    }

    public parse(node: any, scope: Scope): Thing{
        switch(node.tag){
            // Run the AST builders on each Nearley node
            // See: ast_builders for the code that is actually run to build each AST Node
            // See: post for the code that wraps Nearley nodes with AST builders (in particular post.builder)
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
};

const path = process.argv[2];
const content = fs.readFileSync(path, "utf8");

const source = new Source(path, content);

parser.feed(source.content);

if(parser.results.length > 1){
    console.error("! AMBIGUOUS GRAMMAR !")
} else {
    const compiler = new Compiler();

    // Do this binding within the language itself
    const scope = new Scope();
    (scope as any).types.set("none", new Class("", "void", "void", scope));
    (scope as any).types.set("str", new Class("", "char*", "char*", scope));
    (scope as any).functions.set("writeLn", new Function("", "puts", "puts", scope));

    for(const node of parser.results[0]){
        compiler.parse(node, scope);
    }

    if(errors.length === 0){
        const target = new TargetCGcc();
        (scope as any).functions.delete("writeLn");

        for(const func of (scope as any).functions.values()){
            target.compileFunction(func);
        }

        const output = target.output.join("");
        fs.writeFileSync("build/test.c", output);
    }

    // Display errors
    while(errors.length > 0){
        let {format, args, highlight} = errors.pop();

        let color = true;

        // Find the most likely word
        //const incorrect = args[1];
        //if(incorrect !== undefined){
        //    let types = Array.from(compiler.types.values())
        //        .map(type => ({name: type.name, distance: levenshteinDistance(type.name, incorrect)}))
        //        .sort((a, b) => a.distance - b.distance);

        //    args.push(types[0].name);
        //}
        args.push("???");

        // Color each of the arguments
        if(color){
            args = args.map((x:string) => chalk.whiteBright(x));
        }

        const target = highlight[0];

        // First line components
        let banner    = "!";
        let path      = source.path;
        let line      = target.line;
        let col       = target.col;
        let message   = format.replace(/\$(\d+)/g, (_: any, index: number)=> `'${args[index]}'`);

        // Color each of the first line components
        if(color){
            banner  = chalk.bgRedBright.whiteBright(banner);
            path    = chalk.blueBright(path);
            line    = chalk.greenBright(line);
            col     = chalk.greenBright(col);
        }

        // First line
        console.log(`${banner} ${message} (${path}:${line}:${col})`);
        console.log();

        // Context...
        const begin = target.col - 1;
        const end = begin + target.text.length;
        const src = source.content.split(/(\r\n|\r|\n)/g);

        let content = src[target.line * 2 - 2]
        content = content.slice(0, begin) +
            chalk.redBright(content.slice(begin, end)) +
            content.slice(end);

        console.log(target.line + ":     " + content);

        if(errors.length > 0){
            console.log();
            console.log();
            console.log();
        }
    }
}