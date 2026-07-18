import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from 'vitest'

const repositoryRoot = resolve(process.cwd(), '..')
const readme = readFileSync(
  resolve(repositoryRoot, 'README.md'),
  'utf8',
)
const acceptanceReport = readFileSync(
  resolve(
    repositoryRoot,
    'docs/qa/web-prototype-acceptance-report.md',
  ),
  'utf8',
)

test('acceptance report states the measured adult-off six-ending evidence', () => {
  expect(acceptanceReport).toContain(
    'd62fab34987ca00416590b5e6aeb012454396557',
  )
  expect(acceptanceReport).toContain(
    'E2E tests：PASS（45 runs：18 adult-on 路徑 + 18 adult-off 路徑 + 6 responsive runs + 3 sixth-room runs）。',
  )
  expect(acceptanceReport).toContain(
    'Adult-off 證據：PASS；Room A／Room B 的 main、normal、intimacy 於 3 個 viewport 共 18 runs，零 `/adult/` requests；兩個 intimacy endings 分別使用 `a_safe_06` 與 `b_safe_06`。',
  )
})

test('root README documents the implemented prototype workflow and gates', () => {
  expect(readme).toContain('已實作的 Web prototype')
  expect(readme).toContain('npm --prefix prototype-web install')
  expect(readme).toContain('npm --prefix prototype-web run dev')
  expect(readme).toContain('npm --prefix prototype-web run check')
  expect(readme).toMatch(/greybox[\s\S]*正式美術/i)
  expect(readme).toMatch(/playtest export[\s\S]*僅限本機/i)
  expect(readme).toMatch(/Godot[\s\S]*仍受阻擋/i)
})

test('root README documents the playable art pipeline and isolation', () => {
  expect(readme).toContain('art/deliverables/')
  expect(readme).toContain('assets:sync')
  expect(readme).toContain('assets:check-runtime')
  expect(readme).toContain('playable')
  expect(readme).toContain('formal')
  expect(readme).toMatch(/成人設定關閉[\s\S]*\/adult\//)
  expect(readme).toContain('12 秒動態回想')
  expect(readme).toMatch(/8 支[\s\S]*影片[\s\S]*缺口/)
  expect(readme).toContain('build:pages')
})
