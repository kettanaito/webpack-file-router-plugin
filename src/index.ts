import * as path from 'path'
import { Compiler } from 'webpack'
import { createPath, watchDirectory } from 'gatsby-page-utils'

import VirtualModulesPlugin from 'webpack-virtual-modules'

export interface FileRouterPluginOptions {
  variableName: string
  rootDir: string
  pattern?: string
  exclude?: RegExp[]
}

export interface Page {
  url: string
  path: string
  absolutePath: string
}

export type PagesMap = Map<string, Page>

const defaultOptions: FileRouterPluginOptions = {
  variableName: 'ROUTES',
  rootDir: undefined,
  pattern: '**/*.{js,jsx}',
  exclude: [],
}

export class FileRouterPlugin {
  pluginName = 'FileRouterPlugin'

  private options: FileRouterPluginOptions
  private pages: PagesMap
  private manifestPath: string
  private virtualModules: VirtualModulesPlugin

  constructor(options: FileRouterPluginOptions) {
    this.options = Object.assign({}, defaultOptions, options)
    this.pages = new Map()
  }

  apply(compiler: Compiler) {
    const { rootDir, pattern } = this.options

    this.manifestPath = path.join(compiler.context, 'manifest.json')

    this.virtualModules = new VirtualModulesPlugin()
    this.virtualModules.apply(compiler)

    watchDirectory(
      rootDir,
      pattern,
      this.handleFileCreated,
      this.handleFileDeleted,
    )
  }

  private serializePagesMap(pages: PagesMap): Page[] {
    const list: Page[] = []

    for (const [, page] of pages) {
      list.push(page)
    }

    return list
  }

  private writeVirtualModule(pages: PagesMap) {
    console.log('writing virtual module....', this.manifestPath, pages)

    const serializedPages = JSON.stringify(this.serializePagesMap(pages))
    this.virtualModules.writeModule(this.manifestPath, serializedPages)
  }

  /**
   * Determines if the given file path is explicitly excluded.
   */
  private shouldIgnorePath = (path: string): boolean => {
    return this.options.exclude.some((pattern) => pattern.test(path))
  }

  private handleFileCreated = (addedPath: string): void => {
    if (this.shouldIgnorePath(addedPath)) {
      return
    }

    this.pages.set(addedPath, this.createPageAtPath(addedPath))

    console.log('new page has been added!', addedPath)
    this.writeVirtualModule(this.pages)
  }

  private handleFileDeleted = (deletedPath: string): void => {
    if (this.shouldIgnorePath(deletedPath)) {
      return
    }

    this.pages.delete(deletedPath)

    console.log('deleted page!', deletedPath)
    this.writeVirtualModule(this.pages)
  }

  private createPageAtPath(filePath: string): Page {
    return {
      url: createPath(filePath),
      path: filePath,
      absolutePath: path.join(this.options.rootDir, filePath),
    }
  }
}
