import 'source-map-support/register';
import { promises as fs } from 'fs';
import * as Path from 'path';
import { Compiler } from '.';

async function run(directory: string) {
    const files = await fs.readdir(directory);

    for (const file of files) {
        const full = Path.join(directory, file);

        await Compiler.compileFile(full);
    }
}

run('examples');