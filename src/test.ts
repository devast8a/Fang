import { Compiler } from '.';
import * as fs from 'fs';
import * as path from 'path';

async function run(directory: string) {
    for (const file of fs.readdirSync(directory)) {
        const full = path.join(directory, file);

        const stat = fs.statSync(full);

        if (stat.isDirectory()) {
            console.group(file);
            await run(full);
            console.groupEnd();
        } else if (stat.isFile() || stat.isSymbolicLink()) {
            console.group(file);
            try {
                const result = await Compiler.compile(full);
                console.log(result);
            }
            catch (e) {
                console.error(e);
            }
            console.groupEnd();
        }
    }
}

run('examples');