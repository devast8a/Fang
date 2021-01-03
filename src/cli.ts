import 'source-map-support/register';
import * as fs from 'fs';
import {Compiler, Source} from './index';

async function main() {
    console.group("Compiling...");

    const path = process.argv[2];
    const compiler = new Compiler();
    const source = new Source(path, await fs.promises.readFile(path, 'utf8'));
    const output = compiler.compile(source);

    await fs.promises.writeFile("build/test.c", output);

    console.groupEnd();
}

main().catch((e) => {
    console.log(e);
    process.exit(1);
});