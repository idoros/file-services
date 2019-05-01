import { IFileSystemSync } from '@file-services/types';
import { RequestResolver } from '@file-services/resolve';

export interface IModuleSystemOptions {
    /**
     * Sync file system to use when reading files
     * or resolving requests.
     */
    fs: IFileSystemSync;

    /**
     * Exposed to modules as `process.env`.
     *
     * @default { NODE_ENV: 'development' }
     */
    processEnv?: Record<string, string | undefined>;

    /**
     * Resolver to use for `require(...)` calls.
     *
     * @param contextPath absolute path to the context directory of the request
     * @param request request to resolve
     *
     * @default createRequestResolver of `@file-services/resolve`
     */
    resolver?(contextPath: string, request: string): ReturnType<RequestResolver>;
}

export interface ICommonJsModuleSystem {
    /**
     * Map of file path to a loaded module.
     */
    loadedModules: Map<string, IModule>;

    /**
     * Require a module using an absolute file path.
     */
    requireModule(filePath: string): unknown;

    /**
     * Require a module from some context (directory path).
     */
    requireFrom(contextPath: string, request: string): unknown;

    /**
     * Resolve a module request from some context (directory path).
     */
    resolveFrom(contextPath: string, request: string): string;
}

export interface IModule {
    /**
     * Absolute path to module's source file.
     */
    filename: string;

    /**
     * Exported values of module.
     */
    exports: unknown;
}

export type ModuleEvalFn = (
    module: IModule,
    exports: unknown,
    // tslint:disable:variable-name
    __filename: string,
    __dirname: string,
    // tslint:enable:variable-name
    process: {
        env: Record<string, string | undefined>;
    },
    require: (request: string) => unknown,
    global: unknown
) => void;
