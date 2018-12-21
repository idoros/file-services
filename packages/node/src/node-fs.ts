import path from 'path'
import {
    existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, realpathSync,
    rmdirSync, statSync, unlinkSync, writeFileSync, copyFileSync, renameSync, promises
} from 'fs'
const { lstat, mkdir, readdir, readFile, realpath, rmdir, stat, unlink, writeFile, copyFile, rename } = promises

import { createAsyncFileSystem, createSyncFileSystem } from '@file-services/utils'
import { IBaseFileSystem, IFileSystem } from '@file-services/types'
import { NodeWatchService, INodeWatchServiceOptions } from './watch-service'

const caseSensitive = !existsSync(__filename.toUpperCase())

export interface ICreateNodeFsOptions {
    watchOptions?: INodeWatchServiceOptions
}

export function createNodeFs(options?: ICreateNodeFsOptions): IFileSystem {
    const baseFs = createBaseNodeFs(options)

    return {
        ...createSyncFileSystem(baseFs),
        ...createAsyncFileSystem(baseFs),
    }
}

export function createBaseNodeFs(options?: ICreateNodeFsOptions): IBaseFileSystem {
    return {
        path,
        watchService: new NodeWatchService(options && options.watchOptions),
        caseSensitive,
        copyFile,
        copyFileSync,
        lstat,
        lstatSync,
        mkdir,
        mkdirSync,
        readdir,
        readdirSync,
        readFile(filePath, encoding = 'utf8') { return readFile(filePath, encoding) as Promise<string> },
        readFileRaw(filePath) { return readFile(filePath) },
        readFileSync(filePath, encoding = 'utf8') { return readFileSync(filePath, encoding) },
        readFileRawSync(filePath) { return readFileSync(filePath) },
        realpath,
        realpathSync,
        rename,
        renameSync,
        rmdir,
        rmdirSync,
        stat,
        statSync,
        unlink,
        unlinkSync,
        writeFile,
        writeFileSync
    }
}

export const nodeFs: IFileSystem = createNodeFs()
