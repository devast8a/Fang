import { Compiler, Source } from '.';
import { StageEvent } from './compiler';

export class Compile {
    public static string(string: string, options?: StageEvent) {
        const source = Source.fromString(string);
        return Compile.source(source, options);
    }

    public static async file(path: string, options?: StageEvent) {
        const source = await Source.fromFile(path);
        return Compile.source(source, options);
    }

    public static source(source: Source, options?: StageEvent) {
        return Compiler.compile(source, options);
    }
}