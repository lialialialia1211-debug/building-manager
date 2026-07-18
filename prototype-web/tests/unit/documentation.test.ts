import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from 'vitest'

const repositoryRoot = resolve(process.cwd(), '..')
const readme = readFileSync(
  resolve(repositoryRoot, 'README.md'),
  'utf8',
)
const prototypeReadme = readFileSync(
  resolve(process.cwd(), 'README.md'),
  'utf8',
)
const acceptanceReport = readFileSync(
  resolve(
    repositoryRoot,
    'docs/qa/web-prototype-acceptance-report.md',
  ),
  'utf8',
)
const contentReadme = readFileSync(
  resolve(repositoryRoot, 'content/README.md'),
  'utf8',
)
const playableArtQaReportPath = resolve(
  repositoryRoot,
  'docs/qa/2026-07-18-playable-art-integration.md',
)
const playableArtQaReport = existsSync(playableArtQaReportPath)
  ? readFileSync(playableArtQaReportPath, 'utf8')
  : ''

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

test('tracked handoff documents the playable-art release and QA gates', () => {
  expect(prototypeReadme).toContain('GitHub Pages')
  expect(prototypeReadme).toContain('npm --prefix prototype-web run check')
  expect(prototypeReadme).toContain('localhost')
  expect(prototypeReadme).toContain('人工 QA')
  expect(contentReadme).toContain('assets:sync')
  expect(contentReadme).toContain('assets:check-runtime')
  expect(contentReadme).toContain('asset-manifest.json')
  expect(contentReadme).toContain('adult-asset-manifest.json')
  expect(contentReadme).toContain('canonical')
  expect(contentReadme).toContain('playable')
  expect(contentReadme).toContain('formal')
  expect(contentReadme).toContain('12 秒')
  expect(contentReadme).toContain('8 支影片')
  expect(contentReadme).toContain('16 個 UI')
  expect(contentReadme).toContain('16 個 props')
  expect(contentReadme).toContain('6 組 lights')
  expect(contentReadme).toContain('art/deliverables/HANDOFF.md')
  expect(playableArtQaReport).toContain('自動驗證')
  expect(playableArtQaReport).toContain('Tested game commit')
  expect(playableArtQaReport).toContain('Workflow run URL')
  expect(playableArtQaReport).toContain('GitHub Pages URL')
  expect(playableArtQaReport).toContain('Manual QA')
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
