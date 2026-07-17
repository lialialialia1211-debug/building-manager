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
    'Unit/component tests：PASS；201 tests。',
  )
  expect(acceptanceReport).toContain(
    '45 runs：18 adult-on 路線覆蓋 + 18 adult-off 路線覆蓋 + 6 responsive runs + 3 sixth-room runs',
  )
  expect(acceptanceReport).toContain('Adult-off 矩陣：PASS')
  expect(acceptanceReport).toContain('18 runs')
  expect(acceptanceReport).toContain('/adult/')
  expect(acceptanceReport).toContain('a_safe_06')
  expect(acceptanceReport).toContain('b_safe_06')
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
