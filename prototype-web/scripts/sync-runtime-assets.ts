import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  assertRuntimeAssetCopyTargets,
  createRuntimeAssetPlan,
  type RuntimeAssetPlan,
  type PlannedSourceAsset,
} from './runtime-asset-plan'

const here = fileURLToPath(new URL('.', import.meta.url))
const repositoryRoot = resolve(here, '../..')
const assetsRoot = resolve(repositoryRoot, 'content/assets')
const commonAssetsRoot = resolve(assetsRoot, 'common')
const adultAssetsRoot = resolve(assetsRoot, 'adult')
const lockPath = resolve(repositoryRoot, 'content/runtime-assets.lock.json')

interface RuntimeAssetLockEntry {
  id: string
  scope: PlannedSourceAsset['scope']
  sourceId: string
  metadataAssetId: string
  source: {
    master: string
    preview: string
    metadata: string
  }
  target: {
    preview?: string
    full?: string
    background?: string
  }
  targetSha256: {
    preview?: string
    full?: string
    background?: string
  }
}

interface RuntimeAssetLock {
  schemaVersion: 1
  assets: RuntimeAssetLockEntry[]
}

function sortRecord<T>(record: Record<string, T>): Record<string, T> {
  return Object.fromEntries(Object.entries(record).sort(
    ([left], [right]) => left.localeCompare(right),
  ))
}

function manifestContents(plan: RuntimeAssetPlan): {
  common: string
  adult: string
} {
  return {
    common: `${JSON.stringify({
      schemaVersion: 2,
      mode: 'playable',
      backgrounds: sortRecord(plan.backgrounds),
      assets: sortRecord(plan.common),
    }, null, 2)}\n`,
    adult: `${JSON.stringify({
      schemaVersion: 1,
      assets: sortRecord(plan.adult),
    }, null, 2)}\n`,
  }
}

function assertSafeTargetRoots(): void {
  for (const targetRoot of [commonAssetsRoot, adultAssetsRoot]) {
    if (dirname(targetRoot) !== assetsRoot) {
      throw new Error(`refusing to clear unsafe asset root ${targetRoot}`)
    }
  }
}

function absolutePath(repoRelativePath: string): string {
  const absolute = resolve(repositoryRoot, repoRelativePath)
  if (relative(repositoryRoot, absolute).startsWith('..')) {
    throw new Error(`path escapes repository root: ${repoRelativePath}`)
  }
  return absolute
}

function sourceAbsolutePath(
  sourceRoot: string,
  sourceRelativePath: string,
): string {
  const absolute = resolve(sourceRoot, sourceRelativePath)
  if (relative(sourceRoot, absolute).startsWith('..')) {
    throw new Error(`source path escapes source root: ${sourceRelativePath}`)
  }
  return absolute
}

async function sourceState(
  plan: RuntimeAssetPlan,
  sourceRoot: string,
): Promise<'absent' | 'complete'> {
  try {
    await stat(resolve(sourceRoot, 'art/deliverables'))
  } catch {
    return 'absent'
  }
  const errors = plan.validateSources(sourceRoot)
  if (errors.length > 0) {
    throw new Error([
      'runtime asset source checkout is partially present or invalid:',
      ...errors,
    ].join('\n'))
  }
  return 'complete'
}

async function copyPlannedAssets(
  plan: RuntimeAssetPlan,
  sourceRoot: string,
): Promise<void> {
  assertSafeTargetRoots()
  await rm(commonAssetsRoot, { recursive: true, force: true })
  await rm(adultAssetsRoot, { recursive: true, force: true })

  for (const copy of plan.copies) {
    const targetPath = absolutePath(copy.targetPath)
    await mkdir(dirname(targetPath), { recursive: true })
    await copyFile(
      sourceAbsolutePath(sourceRoot, copy.sourcePath),
      targetPath,
    )
  }
}

async function writeManifests(plan: RuntimeAssetPlan): Promise<void> {
  const manifests = manifestContents(plan)
  await writeFile(
    resolve(repositoryRoot, 'content/asset-manifest.json'),
    manifests.common,
  )
  await writeFile(
    resolve(repositoryRoot, 'content/adult-asset-manifest.json'),
    manifests.adult,
  )
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

function targetsForSource(
  plan: RuntimeAssetPlan,
  source: PlannedSourceAsset,
): RuntimeAssetLockEntry['target'] {
  const copies = plan.copies.filter((copy) => copy.id === source.id)
  if (source.scope === 'background') {
    return { background: copies[0]?.targetPath }
  }
  return {
    preview: copies.find((copy) => copy.variant === 'preview')?.targetPath,
    full: copies.find((copy) => copy.variant === 'full')?.targetPath,
  }
}

async function createRuntimeLock(
  plan: RuntimeAssetPlan,
): Promise<RuntimeAssetLock> {
  const assets: RuntimeAssetLockEntry[] = []
  for (const source of plan.sources) {
    const target = targetsForSource(plan, source)
    const targetSha256: RuntimeAssetLockEntry['targetSha256'] = {}
    for (const [variant, path] of Object.entries(target)) {
      if (!path) continue
      targetSha256[variant as keyof typeof targetSha256] = sha256(
        await readFile(absolutePath(path)),
      )
    }
    assets.push({
      id: source.id,
      scope: source.scope,
      sourceId: source.sourceId,
      metadataAssetId: source.metadataAssetId,
      source: {
        master: source.masterPath,
        preview: source.previewPath,
        metadata: source.metadataPath,
      },
      target,
      targetSha256,
    })
  }
  return { schemaVersion: 1, assets }
}

function lockContents(lock: RuntimeAssetLock): string {
  return `${JSON.stringify(lock, null, 2)}\n`
}

async function writeRuntimeLock(plan: RuntimeAssetPlan): Promise<void> {
  await writeFile(lockPath, lockContents(await createRuntimeLock(plan)))
}

async function collectFiles(directory: string): Promise<string[]> {
  const files: string[] = []
  async function visit(currentDirectory: string): Promise<void> {
    for (const entry of await readdir(currentDirectory, {
      withFileTypes: true,
    })) {
      const entryPath = resolve(currentDirectory, entry.name)
      if (entry.isDirectory()) {
        await visit(entryPath)
      } else if (entry.isFile()) {
        files.push(entryPath)
      }
    }
  }

  try {
    await stat(directory)
    await visit(directory)
  } catch {
    return []
  }
  return files.sort()
}

async function checkRuntimeAssets(
  plan: RuntimeAssetPlan,
  sourceRoot: string,
  state: 'absent' | 'complete',
): Promise<string[]> {
  const errors: string[] = []
  const manifests = manifestContents(plan)
  for (const [path, expected] of [
    ['content/asset-manifest.json', manifests.common],
    ['content/adult-asset-manifest.json', manifests.adult],
  ] as const) {
    try {
      if (await readFile(absolutePath(path), 'utf8') !== expected) {
        errors.push(`${path} is out of sync`)
      }
    } catch {
      errors.push(`${path} is missing`)
    }
  }

  const expectedTargets = new Set(plan.copies.map(
    (copy) => absolutePath(copy.targetPath),
  ))
  const actualTargets = await Promise.all([
    collectFiles(commonAssetsRoot),
    collectFiles(adultAssetsRoot),
  ])
  for (const targetPath of actualTargets.flat()) {
    if (!expectedTargets.has(targetPath)) {
      errors.push(`${relative(repositoryRoot, targetPath)} is unexpected`)
    }
  }

  try {
    const expectedLock = lockContents(await createRuntimeLock(plan))
    if (await readFile(lockPath, 'utf8') !== expectedLock) {
      errors.push('content/runtime-assets.lock.json is out of sync')
    }
  } catch {
    errors.push('content/runtime-assets.lock.json is missing or invalid')
  }

  for (const copy of plan.copies) {
    try {
      const target = await readFile(absolutePath(copy.targetPath))
      if (state === 'complete') {
        const source = await readFile(sourceAbsolutePath(
          sourceRoot,
          copy.sourcePath,
        ))
        if (!source.equals(target)) {
          errors.push(`${copy.targetPath} differs from ${copy.sourcePath}`)
        }
      }
    } catch {
      errors.push(`${copy.targetPath} is missing`)
    }
  }

  return errors
}

async function main(): Promise<void> {
  const mode = process.argv[2]
  if (mode !== '--write' && mode !== '--check') {
    throw new Error('usage: sync-runtime-assets.ts --write|--check')
  }

  const plan = createRuntimeAssetPlan(repositoryRoot)
  assertRuntimeAssetCopyTargets(repositoryRoot, plan.copies)
  const configuredSourceRoot = process.env.BUILDING_MANAGER_ART_SOURCE_ROOT
  const sourceRoot = configuredSourceRoot
    ? resolve(configuredSourceRoot)
    : repositoryRoot
  const state = await sourceState(plan, sourceRoot)

  if (mode === '--write') {
    if (state === 'absent') {
      throw new Error(
        'runtime asset sources are required for --write',
      )
    }
    await copyPlannedAssets(plan, sourceRoot)
    await writeManifests(plan)
    await writeRuntimeLock(plan)
    console.log('runtime assets synchronized: 75 common assets, 12 adult assets, 2 backgrounds')
    return
  }

  const errors = await checkRuntimeAssets(plan, sourceRoot, state)
  if (errors.length > 0) {
    for (const error of errors) {
      console.error(error)
    }
    process.exitCode = 1
    return
  }
  console.log(
    state === 'absent'
      ? 'runtime assets are in sync with committed runtime lock (source checkout absent)'
      : 'runtime assets are in sync with sources and committed runtime lock',
  )
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
