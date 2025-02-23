import * as fs from 'fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import {
  createReadStream,
  createWriteStream,
} from 'node:fs';
import { pipeline, Readable, Writable } from 'node:stream'

export class GitActions {
  args: string[];
  constructor({ args }: { args: string[] }) {
    this.args = args;
  }

  public initGit(): void {
    // Uncomment this block to pass the first stage
    fs.mkdirSync(".git", { recursive: true });
    fs.mkdirSync(".git/objects", { recursive: true });
    fs.mkdirSync(".git/refs", { recursive: true });
    fs.writeFileSync(".git/HEAD", "ref: refs/heads/main\n");
    console.log("Initialized git directory");
  }

  public catFile(): void {
    const [, catFlag, blob] = this.args;

    if (catFlag !== '-p' || !blob) {
      throw new Error(`Incomplete cmd; Pass a flag or blob key`);
    }

    const { directory: objectDir, filename: blobString } = this.splitSha(blob);
    // const blobData = fs.readFileSync(path.resolve('.git', 'objects', objectDir, blobString))
    // const decompressed = zlib.inflateSync(new Uint8Array(blobData)).toString();
    const filePath = path.resolve('.git', 'objects', objectDir, blobString);

    this.decompressFile(filePath, zlib.createInflate()).then(result => {
      const content = result.replace(/^blob \d+\0/, '').trim();
      process.stdout.write(content);
    }).catch(err => {
      console.error(`err: ${err}`)
    })
  }

  public hashObject(): void {
    const [, hashFlag, file] = this.args;
    if (hashFlag !== '-w' || !file) {
      throw new Error(`Incomplete cmd; Pass a flag or file path`);
    }

    const deflate = zlib.createDeflate();

    const fileContents = fs.readFileSync(path.resolve(file), 'utf-8');
    const blobHeader = `blob ${fileContents.length}\0`;
    const objectContent = `${blobHeader}${fileContents}\n`.trim()
    const sha = crypto.createHash('sha1').update(objectContent).digest('hex');
    const { directory: newObjDir, filename: objFileName } = this.splitSha(sha);
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
  }

  //TODO: implement full tree response
  public listTree(): void {
    const [, listFlag, listHash] = this.args;
    if ((listFlag && listFlag !== '--name-only') || !listHash) {
      throw new Error(`Invalid command arguments`);
    }

    if (listHash.length !== 40) {
      throw new Error(`Invalid blob sha`);
    }
    // take the sha and split into directory and sha file
    const { directory: treeDir, filename: treeFile } = this.splitSha(listHash);
    // read the file and decompress
    const inflate = zlib.createInflate();
    const blobPath = path.resolve(`.git`, 'objects', treeDir, treeFile);

    //* start of method to decompress using readfile
    // const treePath = fs.readFileSync(path.resolve('.git', 'objects', treeDir, treeFile))
    // const treeData = zlib.inflateSync(new Uint8Array(treePath)).toString();

    // const directories = treeData.split('\0')
    //     .slice(1, -1)
    //     .filter(element => element.split(' ').length > 1)
    //     .map(element => element.split(' ').at(-1))
    //     .join('\n');

    //* end of decompress method using readFile

    this.decompressFile(blobPath, inflate).then(result => {
      const directories = result.split('\0')
        .slice(1, -1)
        .filter(element => element.split(' ').length > 1)
        .map(element => element.split(' ').at(-1))
        .join('\n');

      if (listFlag) {
        process.stdout.write(`${directories}\n`)
      }
    }).catch(err => {
      console.error(`err: ${err}`)
    })
  }

  /**
 * Decompresses a blob file via file streaming
 * @param inputSource 
 * @param transformer 
 * @param destination 
 * @returns decompressed data
 */
  private decompressFile(inputSource: string, transformer: zlib.Inflate): Promise<string> {
    const source = createReadStream(inputSource);
    let result = '';

    const writer = new Writable({
      write(chunk: Buffer, _encoding, callback) {
        result += chunk.toString();
        callback();
      }
    });

    return new Promise((resolve, reject) => {
      pipeline(source, transformer, writer, err => {
        if (err) reject(err);
        resolve(result)
      })
    })
  }

  /**
 * Conforms with the git object directory strucure
 * @param sha 40-character sha1
 * @returns directory and filename
 */
  private splitSha(sha: string): { directory: string, filename: string } {
    return {
      directory: sha.slice(0, 2),
      filename: sha.slice(2)
    };
  }
}