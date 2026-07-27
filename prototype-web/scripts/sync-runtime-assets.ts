import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  createRuntimeAssetPlan,
  type RuntimeAssetEntry,
  type RuntimeAssetPlan,
} from './runtime-asset-plan'

const here = fileURLToPath(new URL('.', import.meta.url))
const repoRoot = resolve(here, '../..')

const COMMON_MANIFEST = 'content/asset-manifest.json'
const ADULT_MANIFEST = 'content/adult-asset-manifest.json'
const RUNTIME_ROOTS = [
  'content/assets/common',
  'content/assets/adult',
] as const

function abs(relativePath: string): string {
  return resolve(repoRoot, relativePath)
}

function sortedEntries(
  entries: Record<string, RuntimeAssetEntry>,
): Record<string, RuntimeAssetEntry> {
  const sorted: Record<string, RuntimeAssetEntry> = {}
  for (const id of Object.keys(entries).sort()) {
    sorted[id] = {
      preview: entries[id]!.preview,
      full: entries[id]!.full,
    }
  }
  return sorted
}

function sortedBackgrounds(
  backgrounds: Record<string, string>,
): Record<string, string> {
  const sorted: Record<string, string> = {}
  for (const id of Object.keys(backgrounds).sort()) {
    sorted[id] = backgrounds[id]!
  }
  return sorted
}

function buildCommonManifest(plan: RuntimeAssetPlan): unknown {
  return {
    schemaVersion: 2,
    mode: 'playable',
    backgrounds: sortedBackgrounds(plan.backgrounds),
    assets: sortedEntries(plan.common),
  }
}

function buildAdultManifest(plan: RuntimeAssetPlan): unknown {
  return {
    schemaVersion: 1,
    assets: sortedEntries(plan.adult),
  }
}

function serialize(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`
}

function assertSafeRuntimeRoot(relativeRoot: string): void {
  const resolved = abs(relativeRoot)
  const parent = dirname(resolved)
  if (parent !== abs('content/assets')) {
    throw new Error(
      `refusing to clean unexpected runtime root ${relativeRoot}`,
    )
  }
}

function verifySources(plan: RuntimeAssetPlan): void {
  const missing = plan.copies
    .filter((copy) => !existsSync(abs(copy.sourcePath)))
    .map((copy) => copy.sourcePath)
  if (missing.length > 0) {
    throw new Error(
      `missing ${missing.length} source files:\n${missing.join('\n')}`,
    )
  }
}

function write(plan: RuntimeAssetPlan): void {
  verifySources(plan)

  for (const relativeRoot of RUNTIME_ROOTS) {
    assertSafeRuntimeRoot(relativeRoot)
    rmSync(abs(relativeRoot), { recursive: true, force: true })
  }

  for (const copy of plan.copies) {
    const target = abs(copy.targetPath)
    mkdirSync(dirname(target), { recursive: true })
    copyFileSync(abs(copy.sourcePath), target)
  }

  writeFileSync(abs(COMMON_MANIFEST), serialize(buildCommonManifest(plan)))
  writeFileSync(abs(ADULT_MANIFEST), serialize(buildAdultManifest(plan)))

  const backgrounds = Object.keys(plan.backgrounds).length
  console.log(
    `assets:sync wrote ${Object.keys(plan.common).length} common, `
    + `${Object.keys(plan.adult).length} adult, `
    + `${backgrounds} backgrounds`,
  )
}

function check(plan: RuntimeAssetPlan): void {
  const problems: string[] = []

  verifySources(plan)

  const compareManifest = (
    relativePath: string,
    expected: unknown,
  ): void => {
    const path = abs(relativePath)
    if (!existsSync(path)) {
      problems.push(`manifest ${relativePath} is missing`)
      return
    }
    const normalize = (text: string): string =>
      text.replace(/\r\n/g, '\n')
    if (normalize(readFileSync(path, 'utf8')) !== serialize(expected)) {
      problems.push(
        `manifest ${relativePath} is out of date (run assets:sync)`,
      )
    }
  }

  compareManifest(COMMON_MANIFEST, buildCommonManifest(plan))
  compareManifest(ADULT_MANIFEST, buildAdultManifest(plan))

  for (const copy of plan.copies) {
    const target = abs(copy.targetPath)
    if (!existsSync(target)) {
      problems.push(`runtime file ${copy.targetPath} is missing`)
      continue
    }
    const source = readFileSync(abs(copy.sourcePath))
    const runtime = readFileSync(target)
    if (!source.equals(runtime)) {
      problems.push(
        `runtime file ${copy.targetPath} differs from source`,
      )
    }
  }

  if (problems.length > 0) {
    for (const problem of problems) console.error(problem)
    process.exitCode = 1
    return
  }

  console.log(
    'assets:check-runtime OK (runtime bundle matches delivered art)',
  )
}

const mode = process.argv.includes('--check') ? 'check' : 'write'
const plan = createRuntimeAssetPlan(repoRoot)
if (mode === 'check') {
  check(plan)
} else {
  write(plan)
}
