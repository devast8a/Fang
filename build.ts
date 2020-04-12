import spawn from 'child_process'

async function main(){
    spawn.execSync("nearleyc grammar.ne -o grammar.ts");
    spawn.execSync("ts-node compile.ts test.fang -o build/test.c");
    spawn.execSync("cc build/test.c -o build/test");
}

main();