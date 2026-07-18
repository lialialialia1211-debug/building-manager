import {
  access,
  copyFile,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  createRuntimeAssetPlan,
  type RuntimeAssetPlan,
} from './runtime-asset-plan'

const here = fileURLToPath(new URL('.', import.meta.url))
const repositoryRoot = resolve(here, '../..')
const assetsRoot = resolve(repositoryRoot, 'content/assets')
const commonAssetsRoot = resolve(assetsRoot, 'common')
const adultAssetsRoot = resolve(assetsRoot, 'adult')

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

async function assertSourcesExist(plan: RuntimeAssetPlan): Promise<void> {
  const missing: string[] = []
  for (const copy of plan.copies) {
    try {
      await access(absolutePath(copy.sourcePath))
    } catch {
      missing.push(copy.sourcePath)
    }
  }
  if (missing.length > 0) {
    throw new Error(`missing runtime asset sources:\n${missing.join('\n')}`)
  }
}

async function copyPlannedAssets(plan: RuntimeAssetPlan): Promise<void> {
  assertSafeTargetRoots()
  await rm(commonAssetsRoot, { recursive: true, force: true })
  await rm(adultAssetsRoot, { recursive: true, force: true })

  for (const copy of plan.copies) {
    const targetPath = absolutePath(copy.targetPath)
    await mkdir(dirname(targetPath), { recursive: true })
    await copyFile(absolutePath(copy.sourcePath), targetPath)
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

async function checkRuntimeAssets(plan: RuntimeAssetPlan): Promise<string[]> {
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

  for (const copy of plan.copies) {
    try {
      const [source, target] = await Promise.all([
        readFile(absolutePath(copy.sourcePath)),
        readFile(absolutePath(copy.targetPath)),
      ])
      if (!source.equals(target)) {
        errors.push(`${copy.targetPath} differs from ${copy.sourcePath}`)
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
  await assertSourcesExist(plan)

  if (mode === '--write') {
    await copyPlannedAssets(plan)
    await writeManifests(plan)
    console.log('runtime assets synchronized: 75 common assets, 12 adult assets, 2 backgrounds')
    return
  }

  const errors = await checkRuntimeAssets(plan)
  if (errors.length > 0) {
    for (const error of errors) {
      console.error(error)
    }
    process.exitCode = 1
    return
  }
  console.log('runtime assets are in sync')
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
