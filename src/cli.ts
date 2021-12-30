#!/usr/bin/env node
import 'source-map-support/register';
import * as fs from 'fs';
import {Compile} from '.';

async function main() {
    console.group("Compiling...");

    const path = process.argv[2];

    const output = await Compile.file(path);

    console.groupEnd();

    await fs.promises.writeFile("build/test.c", output);
}

main().catch((e) => {
    console.log(e);
    process.exit(1);
});