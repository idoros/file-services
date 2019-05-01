import { expect } from 'chai';
import { asyncBaseFsContract, asyncFsContract, syncBaseFsContract, syncFsContract } from '@file-services/test-kit';
import { createMemoryFs } from '@file-services/memory';
import { createOverlayFs } from '@file-services/overlay';

const sampleContent1 = `111`;
const sampleContent2 = `222`;
const sampleContent3 = `333`;

describe('overlay fs', () => {
    const testProvider = async () => {
        return {
            fs: createOverlayFs(createMemoryFs(), createMemoryFs()),
            dispose: async () => undefined,
            tempDirectoryPath: '/'
        };
    };

    syncBaseFsContract(testProvider);
    asyncBaseFsContract(testProvider);
    syncFsContract(testProvider);
    asyncFsContract(testProvider);

    it('overlays higher fs files and folders over lower fs', async () => {
        const srcFile1Path = '/src/file1.js';
        const srcFile2Path = '/src/file2.js';
        const rootFile1Path = '/src/file2.js';
        const folderPath = '/empty-folder';

        const lower = createMemoryFs({
            [srcFile1Path]: sampleContent1,
            [srcFile2Path]: sampleContent2
        });
        const higher = createMemoryFs({
            [rootFile1Path]: sampleContent3,
            [srcFile2Path]: sampleContent3,
            [folderPath]: {}
        });

        const {
            readFileSync,
            fileExistsSync,
            directoryExistsSync,
            existsSync,
            promises: { readFile, fileExists, directoryExists, exists }
        } = createOverlayFs(lower, higher);

        expect(readFileSync(srcFile1Path, 'utf8')).to.equal(sampleContent1);
        expect(readFileSync(srcFile2Path, 'utf8')).to.equal(sampleContent3);
        expect(readFileSync(rootFile1Path, 'utf8')).to.equal(sampleContent3);

        expect(await readFile(srcFile1Path, 'utf8')).to.equal(sampleContent1);
        expect(await readFile(srcFile2Path, 'utf8')).to.equal(sampleContent3);
        expect(await readFile(rootFile1Path, 'utf8')).to.equal(sampleContent3);

        expect(fileExistsSync(srcFile1Path)).to.equal(true);
        expect(fileExistsSync(srcFile2Path)).to.equal(true);
        expect(fileExistsSync(rootFile1Path)).to.equal(true);
        expect(directoryExistsSync(folderPath)).to.equal(true);
        expect(existsSync(folderPath)).to.equal(true);

        expect(await fileExists(srcFile1Path)).to.equal(true);
        expect(await fileExists(srcFile2Path)).to.equal(true);
        expect(await fileExists(rootFile1Path)).to.equal(true);
        expect(await directoryExists(folderPath)).to.equal(true);
        expect(await exists(folderPath)).to.equal(true);
    });

    it('combines child nodes from both higher and lower file systems', async () => {
        const commonFolder = '/src';
        const fileInLower = '/src/file1.js';
        const fileInHigher = '/src/file2.js';
        const folderInLower = '/src/folder-1';
        const folderInHigher = '/src/folder-2';

        const lower = createMemoryFs({
            [fileInLower]: sampleContent1,
            [folderInLower]: {}
        });

        const higher = createMemoryFs({
            [fileInHigher]: sampleContent1,
            [folderInHigher]: {}
        });

        const {
            readdirSync,
            promises: { readdir }
        } = createOverlayFs(lower, higher);

        expect(readdirSync(commonFolder)).to.eql(['file1.js', 'folder-1', 'file2.js', 'folder-2']);
        expect(await readdir(commonFolder)).to.eql(['file1.js', 'folder-1', 'file2.js', 'folder-2']);
    });
});
