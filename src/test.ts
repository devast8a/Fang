import 'source-map-support/register';
import { promises as fs } from 'fs';
import * as Path from 'path';
import { Compiler } from '.';
import chalk from 'chalk';

let SHOW_ERROR = true;

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
                    if (e.message.startsWith('Syntax error')) {
                        const lines = e.message.split('\n')
                        const line = lines[0].split(' at ')[1]
                        const content = lines[2].trim()
                        const token = lines[4].split('"')[1]

                        console.log(`${name}: ${chalk.redBright(`Unexpected token "${token}" at ${line} ${content}`)}`)
                    } else {
                        console.log(`${name}: ${chalk.redBright(e.message)}`)
                    }
                    
                    if (SHOW_ERROR) {
                        console.log(e.stack)
                        SHOW_ERROR = false
                    }
                } else {
                    console.log(`${name}: ${chalk.redBright('<unknown error>')}`)
                }
            }
        }
    }
}

run('examples');