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
  expect(workflow).toContain('branches: [main]')
  expect(workflow).toContain('workflow_dispatch:')
  expect(workflow).toContain('contents: read')
  expect(workflow).toContain('pages: write')
  expect(workflow).toContain('id-token: write')
  expect(workflow).toContain('group: pages')
  expect(workflow).toContain('actions/checkout@v6')
  expect(workflow).toContain('actions/setup-node@v7')
  expect(workflow).toContain('node-version: 24.14.0')
  expect(workflow).toContain('actions/configure-pages@v5')
  expect(workflow).toContain('npm ci')
  expect(workflow).toContain('npm --prefix prototype-web run check')
  expect(workflow).toContain('npm --prefix prototype-web run build:pages')
  expect(workflow).toContain('actions/upload-pages-artifact@v4')
  expect(workflow).toContain('path: prototype-web/dist')
  expect(workflow).toContain('environment:')
  expect(workflow).toContain('name: github-pages')
  expect(workflow).toContain('actions/deploy-pages@v4')
  expect(workflow).not.toContain('--no-verify')
})
