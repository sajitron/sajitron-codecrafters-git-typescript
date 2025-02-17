import * as fs from 'fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import {
    createWriteStream,
} from 'node:fs';
import { pipeline, Readable } from 'node:stream'

const args = process.argv.slice(2);
const command = args[0];

enum Commands {
    Init = "init",
    CatFile = "cat-file",
    HashObject = "hash-object"
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
        const [, catFlag, blob] = args;

        if (catFlag !== '-p' || !blob) {
            throw new Error(`Incomplete cmd; Pass a flag or blob key`);
        }
        const objectDir = blob.slice(0, 2);
        const blobString = blob.slice(2);

        const blobData = fs.readFileSync(path.resolve('.git', 'objects', objectDir, blobString))
        const decompressed = zlib.inflateSync(new Uint8Array(blobData)).toString();
        // strip out 'blob' and number of chars and end of line
        const content = decompressed.replace(/^blob \d+\0/, '').trim();
        process.stdout.write(content);
        break;

    case Commands.HashObject:
        const [, hashFlag, file] = args;
        if (hashFlag !== '-w' || !file) {
            throw new Error(`Incomplete cmd; Pass a flag or file path`);
        }

        const deflate = zlib.createDeflate();

        const fileContents = fs.readFileSync(path.resolve(file), 'utf-8');
        const blobHeader = `blob ${fileContents.length}\0`;
        const objectContent = `${blobHeader}${fileContents}\n`.trim()
        const sha = crypto.createHash('sha1').update(objectContent).digest('hex');
        const newObjDir = sha.slice(0, 2);
        const objFileName = sha.slice(2);
        // Create directory if it doesn't exist
        const objectPath = path.resolve('.git', 'objects', newObjDir);
        fs.mkdirSync(objectPath, { recursive: true });
        // Use Readable.from() to create a stream from the string
        const source = Readable.from(Buffer.from(objectContent));
        // compress data
        const destination = createWriteStream(path.resolve(objectPath, objFileName))

        pipeline(source, deflate, destination, (err) => {
            if (err) throw new Error(`An error occurred: ${err}`);
            process.stdout.write(sha);
        })
        break;

    default:
        throw new Error(`Unknown command ${command}`);
}
