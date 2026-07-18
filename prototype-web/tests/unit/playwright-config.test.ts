import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from 'vitest'
import config from '../../playwright.config'

const workflowPath = resolve(
  process.cwd(),
  '../.github/workflows/deploy-pages.yml',
)
const workflow = existsSync(workflowPath)
  ? readFileSync(workflowPath, 'utf8')
  : ''
const normalizedWorkflow = workflow.replace(/\r\n/g, '\n')

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function topLevelBlock(name: string) {
  const start = `${name}:\n`
  const startIndex = normalizedWorkflow.indexOf(start)

  expect(startIndex).toBeGreaterThanOrEqual(0)

  const remainder = normalizedWorkflow.slice(startIndex + start.length)
  const nextTopLevelKey = remainder.search(/^[^\s][^\n]*:\s*$/m)

  return nextTopLevelKey === -1
    ? remainder
    : remainder.slice(0, nextTopLevelKey)
}

function jobBlock(name: string) {
  const jobs = topLevelBlock('jobs')
  const start = `  ${name}:\n`
  const startIndex = jobs.indexOf(start)

  expect(startIndex).toBeGreaterThanOrEqual(0)

  const remainder = jobs.slice(startIndex + start.length)
  const nextJob = remainder.search(/^  [^\s][^\n]*:\s*$/m)

  return nextJob === -1
    ? remainder
    : remainder.slice(0, nextJob)
}

function expectExactLine(block: string, indentation: number, value: string) {
  expect(block).toMatch(
    new RegExp(`^ {${indentation}}${escapeRegExp(value)}$`, 'm'),
  )
}

function exactLineIndex(block: string, indentation: number, value: string) {
  const index = block
    .split('\n')
    .indexOf(`${' '.repeat(indentation)}${value}`)

  expect(index).toBeGreaterThanOrEqual(0)

  return index
}

test('isolates Playwright on one strict dedicated server', () => {
  const server = Array.isArray(config.webServer)
    ? config.webServer[0]
    : config.webServer
  const expectedUrl = 'http://127.0.0.1:4174'

  expect(server).toBeDefined()
  expect(server?.reuseExistingServer).toBe(false)
  expect(server?.url).toBe(expectedUrl)
  expect(config.use?.baseURL).toBe(expectedUrl)
  expect(server?.command).toContain('--host 127.0.0.1')
  expect(server?.command).toContain('--port 4174')
  expect(server?.command).toContain('--strictPort')
})

test('deploys the fully checked GitHub Pages build from the project base path', () => {
  const triggers = topLevelBlock('on')
  const permissions = topLevelBlock('permissions')
  const concurrency = topLevelBlock('concurrency')
  const build = jobBlock('build')
  const deploy = jobBlock('deploy')

  expectExactLine(triggers, 4, 'branches: [main]')
  expectExactLine(triggers, 2, 'workflow_dispatch:')
  expectExactLine(permissions, 2, 'contents: read')
  expectExactLine(permissions, 2, 'pages: write')
  expectExactLine(permissions, 2, 'id-token: write')
  expectExactLine(concurrency, 2, 'group: pages')
  expectExactLine(concurrency, 2, 'cancel-in-progress: false')

  expectExactLine(build, 8, 'uses: actions/checkout@v6')
  expectExactLine(build, 8, 'uses: actions/setup-node@v7')
  expectExactLine(build, 10, 'node-version: 24.14.0')
  expectExactLine(build, 8, 'uses: actions/configure-pages@v5')
  expectExactLine(build, 8, 'uses: actions/upload-pages-artifact@v4')
  expectExactLine(build, 10, 'path: prototype-web/dist')

  const installIndex = exactLineIndex(build, 8, 'run: npm ci')
  const checkIndex = exactLineIndex(
    build,
    8,
    'run: npm --prefix prototype-web run check',
  )
  const pagesBuildIndex = exactLineIndex(
    build,
    8,
    'run: npm --prefix prototype-web run build:pages',
  )
  const uploadIndex = exactLineIndex(
    build,
    8,
    'uses: actions/upload-pages-artifact@v4',
  )

  expect(checkIndex).toBeGreaterThan(installIndex)
  expect(pagesBuildIndex).toBeGreaterThan(checkIndex)
  expect(uploadIndex).toBeGreaterThan(pagesBuildIndex)

  expectExactLine(deploy, 4, 'needs: build')
  expectExactLine(deploy, 4, 'environment:')
  expectExactLine(deploy, 6, 'name: github-pages')
  expectExactLine(deploy, 8, 'uses: actions/deploy-pages@v4')

  for (const block of [build, deploy]) {
    expect(block).not.toMatch(/^\s*(?:if|continue-on-error):/m)
    expect(block).not.toMatch(
      /--no-verify|--passWithNoTests|--skip(?:\S*)?/,
    )
  }
})
