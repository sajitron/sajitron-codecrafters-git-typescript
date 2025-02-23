import { GitActions } from './actions';

const args = process.argv.slice(2);
const command = args[0];
const gitActions = new GitActions({ args });

enum Commands {
    Init = "init",
    CatFile = "cat-file",
    HashObject = "hash-object",
    ListTree = "ls-tree"
}

interface TreeOutput {
    mode: string;
    treeType: 'tree' | 'blob';
    sha: string;
    name: string;
}

switch (command) {
    case Commands.Init:
        // You can use print statements as follows for debugging, they'll be visible when running tests.
        console.error("Logs from your program will appear here!");
        gitActions.initGit();
        break;

    case Commands.CatFile:
        gitActions.catFile();
        break;

    case Commands.HashObject:
        gitActions.hashObject();
        break;

    case Commands.ListTree:
        gitActions.listTree();
        break;

    default:
        throw new Error(`Unknown command ${command}`);
}