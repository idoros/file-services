import {
    IBaseFileSystemAsync,
    IBaseFileSystemSync,
    IFileSystemAsync,
    IFileSystemSync,
    IDirectoryContents
} from '@file-services/types'

export function createSyncFileSystem(baseFs: IBaseFileSystemSync): IFileSystemSync {
    const { statSync, path, mkdirSync, writeFileSync } = baseFs

    function fileExistsSync(filePath: string, statFn = statSync): boolean {
        try {
            return statFn(filePath).isFile()
        } catch {
            return false
        }
    }

    function directoryExistsSync(directoryPath: string, statFn = statSync): boolean {
        try {
            return statFn(directoryPath).isDirectory()
        } catch {
            return false
        }
    }

    function ensureDirectorySync(directoryPath: string): void {
        if (directoryExistsSync(directoryPath)) {
            return
        }
        try {
            mkdirSync(directoryPath)
        } catch (e) {
            const parentPath = path.dirname(directoryPath)
            if (parentPath === directoryPath) {
                throw e
            }
            ensureDirectorySync(parentPath)
            mkdirSync(directoryPath)
        }
    }

    function populateDirectorySync(directoryPath: string, contents: IDirectoryContents): void {
        ensureDirectorySync(directoryPath)

        for (const [nodeName, nodeValue] of Object.entries(contents)) {
            const nodePath = path.join(directoryPath, nodeName)
            if (typeof nodeValue === 'string') {
                writeFileSync(nodePath, nodeValue)
            } else {
                populateDirectorySync(nodePath, nodeValue)
            }
        }
    }

    return {
        ...baseFs,
        fileExistsSync,
        directoryExistsSync,
        ensureDirectorySync,
        populateDirectorySync
    }
}

export function createAsyncFileSystem(baseFs: IBaseFileSystemAsync): IFileSystemAsync {
    const { stat, path, mkdir, writeFile } = baseFs

    async function fileExists(filePath: string, statFn = stat): Promise<boolean> {
        try {
            return (await statFn(filePath)).isFile()
        } catch {
            return false
        }
    }

    async function directoryExists(directoryPath: string, statFn = stat): Promise<boolean> {
        try {
            return (await statFn(directoryPath)).isDirectory()
        } catch {
            return false
        }
    }

    async function ensureDirectory(directoryPath: string): Promise<void> {
        if (await directoryExists(directoryPath)) {
            return
        }
        try {
            await mkdir(directoryPath)
        } catch (e) {
            const parentPath = path.dirname(directoryPath)
            if (parentPath === directoryPath) {
                throw e
            }
            await ensureDirectory(parentPath)
            await mkdir(directoryPath)
        }
    }

    async function populateDirectory(directoryPath: string, contents: IDirectoryContents): Promise<void> {
        await ensureDirectory(directoryPath)

        for (const [nodeName, nodeValue] of Object.entries(contents)) {
            const nodePath = path.join(directoryPath, nodeName)
            if (typeof nodeValue === 'string') {
                await writeFile(nodePath, nodeValue)
            } else {
                await populateDirectory(nodePath, nodeValue)
            }
        }
    }

    return {
        ...baseFs,
        fileExists,
        directoryExists,
        ensureDirectory,
        populateDirectory
    }
}