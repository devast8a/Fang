#!/usr/bin/env node
import 'source-map-support/register';
import { Compiler } from '.';

async function main() {
    console.group("Compiling...");

    const path = process.argv[2];
    const output = await Compiler.compileFile(path);
    console.log(output);
}

main().catch((e) => {
    console.log(e);
    process.exit(1);
});