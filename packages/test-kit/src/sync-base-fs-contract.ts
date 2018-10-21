import { expect } from 'chai'
import { IBaseFileSystemSync } from '@file-services/types'
import { ITestInput } from './types'
import { WatchEventsValidator } from './events-validator'

const SAMPLE_CONTENT = 'content'
const DIFFERENT_CONTENT = 'another content'

export function syncBaseFsContract(testProvider: () => Promise<ITestInput<IBaseFileSystemSync>>): void {
    describe('SYNC file system contract', () => {
        let testInput: ITestInput<IBaseFileSystemSync>

        beforeEach(async () => testInput = await testProvider())
        afterEach(async () => await testInput.dispose())

        describe('writing files', () => {
            it('can write a new file into an existing directory', () => {
                const { fs, tempDirectoryPath } = testInput
                const { join } = fs.path
                const filePath = join(tempDirectoryPath, 'file')

                fs.writeFileSync(filePath, SAMPLE_CONTENT)

                expect(fs.statSync(filePath).isFile()).to.equal(true)
                expect(fs.readFileSync(filePath)).to.eql(SAMPLE_CONTENT)
            })

            it('can overwrite an existing file', () => {
                const { fs, tempDirectoryPath } = testInput
                const { join } = fs.path
                const filePath = join(tempDirectoryPath, 'file')

                fs.writeFileSync(filePath, SAMPLE_CONTENT)
                fs.writeFileSync(filePath, DIFFERENT_CONTENT)

                expect(fs.statSync(filePath).isFile()).to.equal(true)
                expect(fs.readFileSync(filePath)).to.eql(DIFFERENT_CONTENT)
            })

            it('fails if writing a file to a non-existing directory', () => {
                const { fs, tempDirectoryPath } = testInput
                const { join } = fs.path
                const filePath = join(tempDirectoryPath, 'missing-dir', 'file')

                const expectedToFail = () => fs.writeFileSync(filePath, SAMPLE_CONTENT)

                expect(expectedToFail).to.throw('ENOENT')
            })

            it('fails if writing a file to a path already pointing to a directory', () => {
                const { fs, tempDirectoryPath } = testInput
                const { join } = fs.path
                const directoryPath = join(tempDirectoryPath, 'dir')

                fs.mkdirSync(directoryPath)
                const expectedToFail = () => fs.writeFileSync(directoryPath, SAMPLE_CONTENT)

                expect(expectedToFail).to.throw('EISDIR')
            })
        })

        describe('reading files', () => {
            it('can read the contents of a file', () => {
                const { fs, tempDirectoryPath } = testInput
                const { join } = fs.path
                const firstFilePath = join(tempDirectoryPath, 'first-file')
                const secondFilePath = join(tempDirectoryPath, 'second-file')

                fs.writeFileSync(firstFilePath, SAMPLE_CONTENT)
                fs.writeFileSync(secondFilePath, DIFFERENT_CONTENT)

                expect(fs.readFileSync(firstFilePath), 'contents of first-file').to.eql(SAMPLE_CONTENT)
                expect(fs.readFileSync(secondFilePath), 'contents of second-file').to.eql(DIFFERENT_CONTENT)
            })

            it('fails if reading a non-existing file', () => {
                const { fs, tempDirectoryPath } = testInput
                const { join } = fs.path
                const filePath = join(tempDirectoryPath, 'missing-file')

                const expectedToFail = () => fs.readFileSync(filePath)

                expect(expectedToFail).to.throw('ENOENT')
            })

            it('fails if reading a directory as a file', () => {
                const { fs, tempDirectoryPath } = testInput
                const expectedToFail = () => fs.readFileSync(tempDirectoryPath)

                expect(expectedToFail).to.throw('EISDIR')
            })

        })

        describe('removing files', () => {
            it('can remove files', () => {
                const { fs, tempDirectoryPath } = testInput
                const { join } = fs.path
                const filePath = join(tempDirectoryPath, 'file')

                fs.writeFileSync(filePath, SAMPLE_CONTENT)
                fs.unlinkSync(filePath)

                expect(() => fs.statSync(filePath)).to.throw('ENOENT')
            })

            it('fails if trying to remove a non-existing file', () => {
                const { fs, tempDirectoryPath } = testInput
                const { join } = fs.path
                const filePath = join(tempDirectoryPath, 'missing-file')

                const expectedToFail = () => fs.unlinkSync(filePath)

                expect(expectedToFail).to.throw('ENOENT')
            })

            it('fails if trying to remove a directory as a file', () => {
                const { fs, tempDirectoryPath } = testInput
                const { join } = fs.path
                const directoryPath = join(tempDirectoryPath, 'dir')

                fs.mkdirSync(directoryPath)
                const expectedToFail = () => fs.unlinkSync(directoryPath)

                expect(expectedToFail).to.throw() // linux throws `EISDIR`, mac throws `EPERM`
            })
        })

        describe('watching files', function() {
            this.timeout(10000)

            let validate: WatchEventsValidator
            let testFilePath: string

            beforeEach('create temp fixture file and intialize validator', async () => {
                const { fs, tempDirectoryPath } = testInput
                const { watchService, path } = fs
                validate = new WatchEventsValidator(watchService)

                testFilePath = path.join(tempDirectoryPath, 'test-file')

                fs.writeFileSync(testFilePath, SAMPLE_CONTENT)
                await watchService.watchPath(testFilePath)
            })

            it('emits watch event when a watched file changes', async () => {
                const { fs } = testInput

                fs.writeFileSync(testFilePath, DIFFERENT_CONTENT)

                await validate.nextEvent({ path: testFilePath, stats: fs.statSync(testFilePath) })
                await validate.noMoreEvents()
            })

            it('emits watch event when a watched file is removed', async () => {
                const { fs } = testInput

                fs.unlinkSync(testFilePath)

                await validate.nextEvent({ path: testFilePath, stats: null })
                await validate.noMoreEvents()
            })

            it('keeps watching if file is deleted and recreated immediately', async () => {
                const { fs } = testInput

                fs.writeFileSync(testFilePath, SAMPLE_CONTENT)
                fs.unlinkSync(testFilePath)
                fs.writeFileSync(testFilePath, SAMPLE_CONTENT)

                await validate.nextEvent({ path: testFilePath, stats: fs.statSync(testFilePath) })

                fs.writeFileSync(testFilePath, SAMPLE_CONTENT)

                await validate.nextEvent({ path: testFilePath, stats: fs.statSync(testFilePath) })
                await validate.noMoreEvents()
            })
        })

        describe('creating directories', () => {
            it('can create an empty directory inside an existing one', () => {
                const { fs, tempDirectoryPath } = testInput
                const { join } = fs.path
                const directoryPath = join(tempDirectoryPath, 'new-dir')

                fs.mkdirSync(directoryPath)

                expect(fs.statSync(directoryPath).isDirectory()).to.equal(true)
                expect(fs.readdirSync(directoryPath)).to.eql([])
            })

            it('fails if creating in a path pointing to an existing directory', () => {
                const { fs, tempDirectoryPath } = testInput
                const { join } = fs.path
                const directoryPath = join(tempDirectoryPath, 'dir')

                fs.mkdirSync(directoryPath)
                const expectedToFail = () => fs.mkdirSync(directoryPath)

                expect(expectedToFail).to.throw('EEXIST')
            })

            it('fails if creating in a path pointing to an existing file', () => {
                const { fs, tempDirectoryPath } = testInput
                const { join } = fs.path
                const filePath = join(tempDirectoryPath, 'file')

                fs.writeFileSync(filePath, SAMPLE_CONTENT)
                const expectedToFail = () => fs.mkdirSync(filePath)

                expect(expectedToFail).to.throw('EEXIST')
            })

            it('fails if creating a directory inside a non-existing directory', () => {
                const { fs, tempDirectoryPath } = testInput
                const { join } = fs.path
                const directoryPath = join(tempDirectoryPath, 'outer', 'inner')

                const expectedToFail = () => fs.mkdirSync(directoryPath)

                expect(expectedToFail).to.throw('ENOENT')
            })
        })

        describe('listing directories', () => {
            it('can list an existing directory', () => {
                const { fs, tempDirectoryPath } = testInput
                const { join } = fs.path
                const directoryPath = join(tempDirectoryPath, 'dir')

                fs.mkdirSync(directoryPath)
                fs.writeFileSync(join(directoryPath, 'file1'), SAMPLE_CONTENT)
                fs.writeFileSync(join(directoryPath, 'camelCasedName'), SAMPLE_CONTENT)

                expect(fs.readdirSync(tempDirectoryPath)).to.eql(['dir'])
                const directoryContents = fs.readdirSync(directoryPath)
                expect(directoryContents).to.have.lengthOf(2)
                expect(directoryContents).to.contain('file1')
                expect(directoryContents).to.contain('camelCasedName')
            })

            it('fails if listing a non-existing directory', () => {
                const { fs, tempDirectoryPath } = testInput
                const { join } = fs.path
                const directoryPath = join(tempDirectoryPath, 'missing-dir')

                const expectedToFail = () => fs.readdirSync(directoryPath)

                expect(expectedToFail).to.throw('ENOENT')
            })

            it('fails if listing a path pointing to a file', () => {
                const { fs, tempDirectoryPath } = testInput
                const { join } = fs.path
                const filePath = join(tempDirectoryPath, 'file')

                fs.writeFileSync(filePath, SAMPLE_CONTENT)
                const expectedToFail = () => fs.readdirSync(filePath)

                expect(expectedToFail).to.throw('ENOTDIR')
            })
        })

        describe('removing directories', () => {
            it('can remove an existing directory', () => {
                const { fs, tempDirectoryPath } = testInput
                const { join } = fs.path
                const directoryPath = join(tempDirectoryPath, 'dir')

                fs.mkdirSync(directoryPath)
                fs.rmdirSync(directoryPath)

                expect(() => fs.statSync(directoryPath)).to.throw('ENOENT')
            })

            it('fails if removing a non-empty directory', () => {
                const { fs, tempDirectoryPath } = testInput
                const { join } = fs.path
                const directoryPath = join(tempDirectoryPath, 'dir')

                fs.mkdirSync(directoryPath)
                fs.writeFileSync(join(directoryPath, 'file'), SAMPLE_CONTENT)
                const expectedToFail = () => fs.rmdirSync(directoryPath)

                expect(expectedToFail).to.throw('ENOTEMPTY')
            })

            it('fails if removing a non-existing directory', () => {
                const { fs, tempDirectoryPath } = testInput
                const { join } = fs.path
                const directoryPath = join(tempDirectoryPath, 'missing-dir')

                const expectedToFail = () => fs.rmdirSync(directoryPath)

                expect(expectedToFail).to.throw('ENOENT')
            })

            it('fails if removing a path pointing to a file', () => {
                const { fs, tempDirectoryPath } = testInput
                const { join } = fs.path
                const filePath = join(tempDirectoryPath, 'file')

                fs.writeFileSync(filePath, SAMPLE_CONTENT)
                const expectedToFail = () => fs.rmdirSync(filePath)

                expect(expectedToFail).to.throw()
            })
        })

        describe('watching directories', function() {
            this.timeout(10000)

            let validate: WatchEventsValidator
            let testDirectoryPath: string

            beforeEach('create temp fixture directory and intialize validator', async () => {
                const { fs, tempDirectoryPath } = testInput
                const { watchService, path } = fs
                validate = new WatchEventsValidator(watchService)

                testDirectoryPath = path.join(tempDirectoryPath, 'test-directory')
                fs.mkdirSync(testDirectoryPath)
            })

            it('fires a watch event when a file is added inside a watched directory', async () => {
                const { fs } = testInput
                const { watchService, path } = fs

                await watchService.watchPath(testDirectoryPath)

                const testFilePath = path.join(testDirectoryPath, 'test-file')
                fs.writeFileSync(testFilePath, SAMPLE_CONTENT)

                await validate.nextEvent({ path: testFilePath, stats: fs.statSync(testFilePath) })
                await validate.noMoreEvents()
            })

            it('fires a watch event when a file is changed inside inside a watched directory', async () => {
                const { fs } = testInput
                const { watchService, path } = fs

                const testFilePath = path.join(testDirectoryPath, 'test-file')
                fs.writeFileSync(testFilePath, SAMPLE_CONTENT)
                await watchService.watchPath(testDirectoryPath)

                fs.writeFileSync(testFilePath, SAMPLE_CONTENT)

                await validate.nextEvent({ path: testFilePath, stats: fs.statSync(testFilePath) })
                await validate.noMoreEvents()
            })

            it('fires a watch event when a file is removed inside inside a watched directory', async () => {
                const { fs } = testInput
                const { watchService, path } = fs

                const testFilePath = path.join(testDirectoryPath, 'test-file')
                fs.writeFileSync(testFilePath, SAMPLE_CONTENT)
                await watchService.watchPath(testDirectoryPath)

                fs.unlinkSync(testFilePath)

                await validate.nextEvent({ path: testFilePath, stats: null })
                await validate.noMoreEvents()
            })
        })

        describe('watching both directories and files', function() {
            this.timeout(10000)

            let validate: WatchEventsValidator
            let testDirectoryPath: string
            let testFilePath: string

            beforeEach('create temp fixture directory and intialize watchService', async () => {
                const { fs, tempDirectoryPath } = testInput
                const { watchService, path } = fs
                validate = new WatchEventsValidator(watchService)

                testDirectoryPath = path.join(tempDirectoryPath, 'test-directory')
                fs.mkdirSync(testDirectoryPath)
                testFilePath = path.join(testDirectoryPath, 'test-file')
                fs.writeFileSync(testFilePath, SAMPLE_CONTENT)
            })

            it('allows watching watching a file and its containing directory', async () => {
                const { fs } = testInput
                const { watchService } = fs

                await watchService.watchPath(testFilePath)
                await watchService.watchPath(testDirectoryPath)

                fs.writeFileSync(testFilePath, SAMPLE_CONTENT)

                await validate.nextEvent({ path: testFilePath, stats: fs.statSync(testFilePath) })
                await validate.noMoreEvents()
            })

            it('allows watching in any order', async () => {
                const { fs } = testInput
                const { watchService } = fs

                await watchService.watchPath(testDirectoryPath)
                await watchService.watchPath(testFilePath)

                fs.writeFileSync(testFilePath, SAMPLE_CONTENT)

                await validate.nextEvent({ path: testFilePath, stats: fs.statSync(testFilePath) })
                await validate.noMoreEvents()
            })
        })

        it('correctly exposes whether it is case sensitive', () => {
            const { fs, tempDirectoryPath } = testInput
            const { join } = fs.path
            const filePath = join(tempDirectoryPath, 'file')
            const upperCaseFilePath = filePath.toUpperCase()

            fs.writeFileSync(filePath, SAMPLE_CONTENT)

            if (fs.caseSensitive) {
                expect(() => fs.statSync(upperCaseFilePath)).to.throw('ENOENT')
            } else {
                expect(fs.statSync(upperCaseFilePath).isFile()).to.equal(true)
            }
        })
    })
}