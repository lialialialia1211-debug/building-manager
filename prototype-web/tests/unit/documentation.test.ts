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

test('acceptance report states the exact 30-run viewport breakdown', () => {
  expect(acceptanceReport).toContain(
    'Unit/component tests：PASS；201 tests。',
  )
  expect(acceptanceReport).toContain(
    '30 runs：27 project-viewport runs + 3 repeated 600×900 overrides',
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
