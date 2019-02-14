import { createRequestResolver } from '@file-services/resolve'
import { IModuleSystemOptions, IModule, ModuleEvalFn, ICommonJsModuleSystem } from './types'
import { globalThis } from './global-this'

export function createCjsModuleSystem(options: IModuleSystemOptions): ICommonJsModuleSystem {
    const {
        fs,
        fs: {
            readFileSync,
            path: { dirname }
        },
        processEnv = { NODE_ENV: 'development' }
    } = options

    const { resolver = createRequestResolver({ fs }) } = options

    const loadedModules = new Map<string, IModule>()
    const globalProcess = { env: processEnv }

    const resolveFrom = (contextPath: string, request: string, origin?: string): string => {
        const resolvedRequest = resolver(contextPath, request)
        if (!resolvedRequest) {
            throw new Error(`Cannot resolve "${request}" in ${origin || contextPath}`)
        }
        return resolvedRequest.resolvedFile
    }

    return {
        requireModule,
        requireFrom,
        resolveFrom,
        loadedModules
    }

    function requireFrom(contextPath: string, request: string, origin?: string): unknown {
        return requireModule(resolveFrom(contextPath, request, origin))
    }

    function requireModule(filePath: string): unknown {
        const existingModule = loadedModules.get(filePath)
        if (existingModule) {
            return existingModule.exports
        }

        const newModule: IModule = { exports: {}, filename: filePath }

        const fileContents = readFileSync(filePath, 'utf8')
        const contextPath = dirname(filePath)

        if (filePath.endsWith('.json')) {
            newModule.exports = JSON.parse(fileContents)
            loadedModules.set(filePath, newModule)
            return newModule.exports
        }

        // tslint:disable-next-line:no-eval
        const moduleFn: ModuleEvalFn = eval(
            `(function (module, exports, __filename, __dirname, process, require, global){${fileContents}\n})`
        )

        loadedModules.set(filePath, newModule)
        const requireFromContext = (request: string) => requireFrom(contextPath, request, filePath)
        requireFromContext.resolve = (request: string) => resolveFrom(contextPath, request, filePath)

        try {
            moduleFn(newModule, newModule.exports, filePath, contextPath, globalProcess, requireFromContext, globalThis)
        } catch (e) {
            loadedModules.delete(filePath)
            throw e
        }

        return newModule.exports
    }
}
