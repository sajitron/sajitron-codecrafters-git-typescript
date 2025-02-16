import * as fs from 'fs';
import path from 'node:path';
import zlib from 'node:zlib';

const args = process.argv.slice(2);
const command = args[0];

enum Commands {
    Init = "init",
    CatFile = "cat-file"
}

switch (command) {
    case Commands.Init:
        // You can use print statements as follows for debugging, they'll be visible when running tests.
        console.error("Logs from your program will appear here!");

        // Uncomment this block to pass the first stage
        fs.mkdirSync(".git", { recursive: true });
        fs.mkdirSync(".git/objects", { recursive: true });
        fs.mkdirSync(".git/refs", { recursive: true });
        fs.writeFileSync(".git/HEAD", "ref: refs/heads/main\n");
        console.log("Initialized git directory");
        break;

    case Commands.CatFile:
        const [, flag, blob] = args;

        if (flag !== '-p' || !blob) {
            throw new Error(`Incomplete cmd; Pass a flag or blob key`);
        }
        const objectDir = blob.slice(0, 2);
        const blobString = blob.slice(2);

        const blobData = fs.readFileSync(path.resolve('.git', 'objects', objectDir, blobString))
        const decompressed = zlib.inflateSync(new Uint8Array(blobData)).toString();
        // strip out 'blob' and number of chars and end of line
        const content = decompressed.replace(/^blob \d+\0/, '').trim().replace(/\n|\r/g, "");
        process.stdout.write(content);
        break;

    default:
        throw new Error(`Unknown command ${command}`);
}
