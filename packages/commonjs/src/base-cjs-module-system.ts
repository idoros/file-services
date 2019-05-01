import { IBaseModuleSystemOptions, IModule, ModuleEvalFn, ICommonJsModuleSystem } from './types';
import { globalThis } from './global-this';

export function createBaseCjsModuleSystem(options: IBaseModuleSystemOptions): ICommonJsModuleSystem {
    const { resolveFrom, dirname, readFileSync, processEnv = { NODE_ENV: 'development' } } = options;

    const loadedModules = new Map<string, IModule>();
    const globalProcess = { env: processEnv };

    return {
        requireModule,
        requireFrom,
        resolveFrom,
        loadedModules
    };

    function resolveThrow(contextPath: string, request: string, requestOrigin?: string): string {
        const resolvedRequest = resolveFrom(contextPath, request, requestOrigin);
        if (resolvedRequest === undefined) {
            throw new Error(`Cannot resolve "${request}" in ${requestOrigin || contextPath}`);
        }
        return resolvedRequest;
    }

    function requireFrom(contextPath: string, request: string, requestOrigin?: string): unknown {
        return requireModule(resolveThrow(contextPath, request, requestOrigin));
    }

    function requireModule(filePath: string): unknown {
        const existingModule = loadedModules.get(filePath);
        if (existingModule) {
            return existingModule.exports;
        }

        const newModule: IModule = { exports: {}, filename: filePath };

        const contextPath = dirname(filePath);
        const fileContents = readFileSync(filePath);

        if (filePath.endsWith('.json')) {
            newModule.exports = JSON.parse(fileContents);
            loadedModules.set(filePath, newModule);
            return newModule.exports;
        }

        // tslint:disable-next-line:no-eval
        const moduleFn: ModuleEvalFn = eval(
            `(function (module, exports, __filename, __dirname, process, require, global){${fileContents}\n})`
        );

        loadedModules.set(filePath, newModule);
        const requireFromContext = (request: string) => requireFrom(contextPath, request, filePath);
        requireFromContext.resolve = (request: string) => resolveThrow(contextPath, request, filePath);

        try {
            moduleFn(
                newModule,
                newModule.exports,
                filePath,
                contextPath,
                globalProcess,
                requireFromContext,
                globalThis
            );
        } catch (e) {
            loadedModules.delete(filePath);
            throw e;
        }

        return newModule.exports;
    }
}
