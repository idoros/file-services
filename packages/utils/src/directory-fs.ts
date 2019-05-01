import {
    IBaseFileSystem,
    IFileSystem,
    WatchEventListener,
    IWatchService,
    CallbackFn,
    CallbackFnVoid,
    IBaseFileSystemSyncActions,
    IBaseFileSystemCallbackActions,
    IBaseFileSystemPromiseActions,
    ReadFileOptions,
    WriteFileOptions
} from '@file-services/types';
import * as posixPath from '@file-services/posix-path';
import { createFileSystem } from './create-extended-api';

/**
 * Creates a wrapped `IFileSystem` which scopes the provided `fs`
 * to the provided `directoryPath`.
 *
 * @param fs the file system to scope
 * @param directoryPath the directory path to scope to
 */
export function createDirectoryFs(fs: IFileSystem, directoryPath: string): IFileSystem {
    const { watchService, promises } = fs;
    const { join, relative, sep } = fs.path;

    let workingDirectoryPath: string = posixPath.POSIX_ROOT;

    function resolveScopedPath(...pathSegments: string[]): string {
        return posixPath.resolve(workingDirectoryPath, ...pathSegments);
    }

    function resolveFullPath(path: string): string {
        return join(directoryPath, resolveScopedPath(path));
    }

    const scopedListeners: WeakMap<WatchEventListener, WatchEventListener> = new WeakMap();

    function createScopedListener(listener: WatchEventListener) {
        const scopedListener: WatchEventListener = e => {
            const relativeEventPath = relative(directoryPath, e.path);
            // we don't want to pass events outside of scoped directory
            if (!relativeEventPath.startsWith(`..${sep}`)) {
                listener({
                    stats: e.stats,
                    // use posixPath to ensure we give posix-style paths back
                    path: posixPath.join(posixPath.POSIX_ROOT, relativeEventPath.replace(/\\/g, '/'))
                });
            }
        };
        scopedListeners.set(listener, scopedListener);
        return scopedListener;
    }

    const scopedWatchService: IWatchService = {
        async watchPath(path, listener) {
            if (listener) {
                listener = scopedListeners.get(listener) || createScopedListener(listener);
            }
            return watchService.watchPath(resolveFullPath(path), listener);
        },
        async unwatchPath(path, listener) {
            if (listener) {
                listener = scopedListeners.get(listener) || listener;
            }
            return watchService.unwatchPath(resolveFullPath(path), listener);
        },
        async unwatchAllPaths() {
            return watchService.unwatchAllPaths();
        },
        addGlobalListener(listener) {
            return watchService.addGlobalListener(scopedListeners.get(listener) || createScopedListener(listener));
        },
        removeGlobalListener(listener) {
            return watchService.removeGlobalListener(scopedListeners.get(listener) || listener);
        },
        clearGlobalListeners() {
            return watchService.clearGlobalListeners();
        }
    };

    const scopedBaseFs: IBaseFileSystem = {
        path: {
            ...posixPath,
            resolve: resolveScopedPath
        },
        caseSensitive: fs.caseSensitive,
        watchService: scopedWatchService,
        cwd() {
            return workingDirectoryPath;
        },
        chdir(path) {
            workingDirectoryPath = resolveScopedPath(path);
        },
        promises: {
            copyFile(srcPath, destPath, ...restArgs) {
                return promises.copyFile(resolveFullPath(srcPath), resolveFullPath(destPath), ...restArgs);
            },
            lstat(path) {
                return promises.lstat(resolveFullPath(path));
            },
            mkdir(path) {
                return promises.mkdir(resolveFullPath(path));
            },
            readdir(path) {
                return promises.readdir(resolveFullPath(path));
            },
            readFile: function readFile(path: string, ...restArgs: [ReadFileOptions]) {
                return promises.readFile(resolveFullPath(path), ...restArgs);
            } as IBaseFileSystemPromiseActions['readFile'],
            realpath(path) {
                return promises.realpath(resolveFullPath(path));
            },
            rename(srcPath, destPath) {
                return promises.rename(resolveFullPath(srcPath), resolveFullPath(destPath));
            },
            rmdir(path) {
                return promises.rmdir(resolveFullPath(path));
            },
            exists(path) {
                return promises.exists(resolveFullPath(path));
            },
            stat(path) {
                return promises.stat(resolveFullPath(path));
            },
            unlink(path) {
                return promises.unlink(resolveFullPath(path));
            },
            writeFile(path, ...restArgs) {
                return promises.writeFile(resolveFullPath(path), ...restArgs);
            },
            readlink(path) {
                return promises.readlink(resolveFullPath(path));
            }
        },
        copyFileSync(src, dest, ...restArgs) {
            return fs.copyFileSync(resolveFullPath(src), resolveFullPath(dest), ...restArgs);
        },
        lstatSync(path) {
            return fs.lstatSync(resolveFullPath(path));
        },
        mkdirSync(path) {
            return fs.mkdirSync(resolveFullPath(path));
        },
        readdirSync(path) {
            return fs.readdirSync(resolveFullPath(path));
        },
        readFileSync: function readFileSync(path: string, ...restArgs: [ReadFileOptions]) {
            return fs.readFileSync(resolveFullPath(path), ...restArgs);
        } as IBaseFileSystemSyncActions['readFileSync'],
        realpathSync(path) {
            return fs.realpathSync(resolveFullPath(path));
        },
        readlinkSync(path) {
            return fs.readlinkSync(resolveFullPath(path));
        },
        renameSync(srcPath, destPath) {
            return fs.renameSync(resolveFullPath(srcPath), resolveFullPath(destPath));
        },
        rmdirSync(path) {
            return fs.rmdirSync(resolveFullPath(path));
        },
        existsSync(path) {
            return fs.existsSync(resolveFullPath(path));
        },
        statSync(path) {
            return fs.statSync(resolveFullPath(path));
        },
        unlinkSync(path) {
            return fs.unlinkSync(resolveFullPath(path));
        },
        writeFileSync(path, ...restArgs: [string, WriteFileOptions]) {
            return fs.writeFileSync(resolveFullPath(path), ...restArgs);
        },
        copyFile: function copyFile(srcPath: string, destPath: string, ...restArgs: [CallbackFnVoid]) {
            fs.copyFile(resolveFullPath(srcPath), resolveFullPath(destPath), ...restArgs);
        } as IBaseFileSystemCallbackActions['copyFile'],
        lstat(path, callback) {
            fs.lstat(resolveFullPath(path), callback);
        },
        mkdir(path, callback) {
            fs.mkdir(resolveFullPath(path), callback);
        },
        readdir(path, callback) {
            return fs.readdir(resolveFullPath(path), callback);
        },
        readFile: function readFile(path: string, ...restArgs: [string, CallbackFn<string | Buffer>]) {
            return fs.readFile(resolveFullPath(path), ...restArgs);
        } as IBaseFileSystemCallbackActions['readFile'],
        realpath(path, callback) {
            return fs.realpath(resolveFullPath(path), callback);
        },
        rename(path, newPath, callback) {
            return fs.rename(resolveFullPath(path), resolveFullPath(newPath), callback);
        },
        rmdir(path, callback) {
            return fs.rmdir(resolveFullPath(path), callback);
        },
        exists(path, callback) {
            return fs.exists(resolveFullPath(path), callback);
        },
        stat(path, callback) {
            return fs.stat(resolveFullPath(path), callback);
        },
        unlink(path, callback) {
            return fs.unlink(resolveFullPath(path), callback);
        },
        writeFile: function writeFile(path: string, ...restArgs: [string, CallbackFnVoid]) {
            return fs.writeFile(resolveFullPath(path), ...restArgs);
        } as IBaseFileSystemCallbackActions['writeFile'],
        readlink(path, callback) {
            return fs.readlink(resolveFullPath(path), callback);
        }
    };

    return createFileSystem(scopedBaseFs);
}
