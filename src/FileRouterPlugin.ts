import * as path from 'path'
import { Compiler } from 'webpack'
import { toConstantDependency } from 'webpack/lib/javascript/JavascriptParserHelpers'
import { createPath, watchDirectory } from 'gatsby-page-utils'

export interface FileRouterPluginOptions {
  variableName: string
  rootDir: string
  pattern?: string
  exclude?: RegExp[]
}

export interface Pages {
  url: string
  path: string
  absolutePath: string
}

const defaultOptions: FileRouterPluginOptions = {
  variableName: 'ROUTES',
  rootDir: undefined,
  pattern: '**/*.{js,jsx}',
  exclude: [],
}

export class FileRouterPlugin {
  private options: FileRouterPluginOptions
  private pages: Array<Pages>

  constructor(options: FileRouterPluginOptions) {
    this.options = Object.assign({}, defaultOptions, options)
    this.pages = []
  }

  apply(compiler: Compiler) {
    const { rootDir, pattern } = this.options
    const watchedFiles = watchDirectory(
      rootDir,
      pattern,
      this.handleFileCreated,
      this.handleFileDeleted,
    )

    compiler.hooks.beforeCompile.tapPromise('FileRouterPlugin', () => {
      return watchedFiles
    })

    compiler.hooks.compilation.tap(
      'FileRouterPlugin',
      (_, { normalModuleFactory }) => {
        normalModuleFactory.hooks.parser
          .for('javascript/auto')
          .tap('FileRouterPlugin', this.injectRuntimeVariable)

        normalModuleFactory.hooks.parser
          .for('javascript/dynamic')
          .tap('FileRouterPlugin', this.injectRuntimeVariable)

        normalModuleFactory.hooks.parser
          .for('javascript/esm')
          .tap('FileRouterPlugin', this.injectRuntimeVariable)
      },
    )
  }

  private injectRuntimeVariable = (parser: any) => {
    parser.hooks.expression
      .for(this.options.variableName)
      .tap('FileRouterPlugin', (exp) => {
        return toConstantDependency(parser, JSON.stringify(this.pages))(exp)
      })
  }

  private shouldIgnorePath = (path: string): boolean => {
    return this.options.exclude.some((pattern) => pattern.test(path))
  }

  private handleFileCreated = (addedPath: string): void => {
    if (this.shouldIgnorePath(addedPath)) {
      return
    }

    this.pages.push({
      path: addedPath,
      url: createPath(addedPath),
      absolutePath: path.join(this.options.rootDir, addedPath),
    })

    this.sortPages()
  }

  private handleFileDeleted = (deletedPath: string): void => {
    if (this.shouldIgnorePath(deletedPath)) {
      return
    }

    const nextPages = this.pages.filter((page) => {
      return page.path !== deletedPath
    })

    this.pages = nextPages
  }

  /**
   * Sorts the generated pages alphabetically.
   */
  private sortPages = (): void => {
    this.pages.sort((a, b) => {
      if (a.path > b.path) {
        return 1
      }

      if (a.path < b.path) {
        return -1
      }

      return 0
    })
  }
}
