import 'source-map-support/register';
import { promises as fs } from 'fs';
import * as Path from 'path';
import { Compiler } from '.';
import chalk from 'chalk';

async function run(directory: string) {
    const files = await fs.readdir(directory);

    files.sort((a, b) => {
        return a.localeCompare(b, undefined, { numeric: true });
    })

    for (const file of files) {
        const full = Path.join(directory, file);

        const stat = await fs.stat(full);
        if (stat.isDirectory()) {
            console.group(file);
            await run(full);
            console.groupEnd();
        } else if (Path.extname(file) === '.fang') {
            const name = Path.basename(file, '.fang');

            try {
                const module = await Compiler.compileFile(full);

                const fn = module.get('main') ?? module.get('$body');
                const result = fn();

                switch (result) {
                    case true:  console.log(`${name}: ${chalk.greenBright('Passed')}`); break;
                    case false: console.log(`${name}: ${chalk.redBright('Failed')}`); break;
                    default:    console.log(`${name}: `, result);
                }
            } catch (e) {
                if (e instanceof Error) {
                    console.log(`${name}: ${chalk.redBright(e.message)}`)
                } else {
                    console.log(`${name}: ${chalk.redBright('<unknown error>')}`)
                }
            }
        }
    }
}

run('examples');