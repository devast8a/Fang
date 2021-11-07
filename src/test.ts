import { Compiler } from '.';
import 'source-map-support/register';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

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
            }
            catch (e) {
                if (!(e instanceof Error)) {
                    throw e;
                }

                const symbol = chalk.bgRedBright.whiteBright(` INTERNAL ERROR `);
                const message = e.stack ?? e.message;

                const file = chalk.cyanBright(full);

                console.error(`${symbol}  ${file}  ${message}`);
            }
            console.groupEnd();
        }
    }
}

run('examples');