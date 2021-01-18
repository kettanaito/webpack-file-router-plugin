import * as path from 'path'
import { webpack } from 'webpack'
import { createTeardown, addFile, addDirectory } from 'fs-teardown'
import { FileRouterPlugin } from '../src/FileRouterPlugin'

const FIXTURE_PATH = path.join(__dirname, 'fixtures/static-directory')

const { prepare, getPath, cleanup } = createTeardown(
  FIXTURE_PATH,
  addFile('input.js', 'export const pagesRef = PAGES'),
  addDirectory('pages', addFile('01-first.js'), addFile('02-second.js')),
)

beforeAll(async () => {
  await prepare()
})

afterAll(async () => {
  await cleanup()
})

test('injects pages manifest globally', (done) => {
  webpack(
    {
      mode: 'development',
      entry: getPath('input.js'),
      output: {
        path: getPath('.'),
        filename: 'output.js',
        library: 'result',
        libraryTarget: 'commonjs',
      },
      devtool: false,
      watch: false,
      plugins: [
        new FileRouterPlugin({
          variableName: 'PAGES',
          rootDir: getPath('pages'),
        }),
      ],
    },
    (error, stats) => {
      if (error) {
        return error
      }

      expect(stats.hasWarnings()).toBe(false)
      expect(stats.hasErrors()).toBe(false)

      const { result } = require(getPath('output.js'))
      expect(result.pagesRef).toEqual([
        {
          url: '/01-first/',
          path: '01-first.js',
          absolutePath: getPath('pages/01-first.js'),
        },
        {
          url: '/02-second/',
          path: '02-second.js',
          absolutePath: getPath('pages/02-second.js'),
        },
      ])

      done()
    },
  )
})
