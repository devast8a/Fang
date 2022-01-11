import { Compile } from '.';
import 'source-map-support/register';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { serialize } from './ast/serialize';

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
                let count = 0;
                const code = await Compile.file(full, (name, stage, module) => {
                    count++;
                    const full = `debug/${directory}/stages/${file}/${count}-${name}.txt`;
                    fs.mkdirSync(path.dirname(full), {recursive: true});
                    fs.writeFileSync(full, serialize(module), 'utf8');
                });

                const f2 = `debug/${directory}/${file}.c`;
                fs.mkdirSync(path.dirname(f2), {recursive: true});
                fs.writeFileSync(f2, code, 'utf8');
            }
            catch (e) {
                if (!(e instanceof Error)) {
                    throw e;
                }

                const symbol = chalk.bgRedBright.whiteBright(` INTERNAL ERROR `);
                const file = chalk.cyanBright(full);
                console.error(`${symbol}  ${file}  ${e.stack ?? e.message}`);
            }
            console.groupEnd();
        }
    }
}

run('examples');