import { expect, test } from 'vitest'
import config from '../../playwright.config'

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
