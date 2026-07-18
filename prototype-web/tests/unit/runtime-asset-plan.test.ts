import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { expect, test } from 'vitest'
import {
  assertRuntimeAssetCopyTargets,
  createRuntimeAssetPlan,
  type PlannedCopy,
} from '../../scripts/runtime-asset-plan'

const repositoryRoot = resolve(process.cwd(), '..')

function runRuntimeAssetCommand(
  mode: '--write' | '--check',
  sourceRoot?: string,
) {
  return spawnSync(process.execPath, [
    '--import',
    'tsx',
    'scripts/sync-runtime-assets.ts',
    mode,
  ], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: {
      ...process.env,
      ...(sourceRoot
        ? { BUILDING_MANAGER_ART_SOURCE_ROOT: sourceRoot }
        : {}),
    },
  })
}

function createSourceFixture(): string {
  const fixtureRoot = mkdtempSync(resolve(tmpdir(), 'building-art-source-'))
  const plan = createRuntimeAssetPlan(repositoryRoot)
  for (const source of plan.sources) {
    for (const path of [source.masterPath, source.previewPath]) {
      mkdirSync(dirname(resolve(fixtureRoot, path)), { recursive: true })
      writeFileSync(resolve(fixtureRoot, path), `${source.id}:${path}`)
    }
    mkdirSync(dirname(resolve(fixtureRoot, source.metadataPath)), {
      recursive: true,
    })
    writeFileSync(resolve(fixtureRoot, source.metadataPath), JSON.stringify({
      asset_id: source.metadataAssetId,
      export: { master: `${source.sourceId}_master.webp` },
    }))
  }
  return fixtureRoot
}

function assertCheckFailsAfter(mutate: () => void): void {
  expect(runRuntimeAssetCommand('--write').status).toBe(0)
  try {
    mutate()
    expect(runRuntimeAssetCommand('--check').status).toBe(1)
  } finally {
    expect(runRuntimeAssetCommand('--write').status).toBe(0)
    expect(runRuntimeAssetCommand('--check').status).toBe(0)
  }
}

test('builds the complete canonical runtime asset plan', () => {
  const plan = createRuntimeAssetPlan(repositoryRoot)

  expect(Object.keys(plan.common)).toHaveLength(75)
  expect(Object.keys(plan.adult)).toEqual([
    'a_intimacy_01',
    'a_intimacy_02',
    'a_intimacy_03',
    'a_intimacy_04',
    'a_intimacy_05',
    'a_intimacy_06',
    'b_intimacy_01',
    'b_intimacy_02',
    'b_intimacy_03',
    'b_intimacy_04',
    'b_intimacy_05',
    'b_intimacy_06',
  ])
  expect(plan.backgrounds).toEqual({
    building_a: '/assets/common/backgrounds/building_a_master.webp',
    building_b: '/assets/common/backgrounds/building_b_master.webp',
  })
  expect(plan.common.a1_fuse).toEqual({
    preview: '/assets/common/panels/a1_fuse_preview.webp',
    full: '/assets/common/panels/a1_fuse_master.webp',
  })
  expect(plan.common.a_ending_main).toEqual({
    preview: '/assets/common/panels/a_ending_main_preview.webp',
    full: '/assets/common/panels/a_ending_main_master.webp',
  })
  expect(plan.adult.a_intimacy_01).toEqual({
    preview: '/assets/adult/a_intimacy_01_preview.webp',
    full: '/assets/adult/a_intimacy_01_master.webp',
  })
  expect(plan.sources).toHaveLength(89)
})

test('plans the complete metadata triplet and approved metadata IDs', () => {
  const plan = createRuntimeAssetPlan(repositoryRoot)

  const prefixed = new Set([
    'a1_fuse',
    'a2d_chain',
    'a4_comfort',
    'b1_glass',
    'b2n_hall',
    'b6_open',
  ])
  for (const source of plan.sources) {
    expect(source.masterPath).toBe(
      `art/deliverables/${source.directory}/${source.sourceId}_master.webp`,
    )
    expect(source.previewPath).toBe(
      `art/deliverables/${source.directory}/${source.sourceId}_preview.webp`,
    )
    expect(source.metadataPath).toBe(
      `art/deliverables/${source.directory}/${source.sourceId}_meta.json`,
    )
    expect(source.metadataAssetId).toBe(
      prefixed.has(source.id)
        ? `card-${source.sourceId}`
        : source.scope === 'background'
          ? `bg-${source.sourceId.replace('bg_', '')}`
          : source.sourceId,
    )
  }
})

test('source validation reads metadata and rejects missing, mismatched, and duplicate records', async () => {
  const sourceRoot = createSourceFixture()
  const plan = createRuntimeAssetPlan(repositoryRoot)
  try {
    expect(await plan.validateSources(sourceRoot)).toEqual([])

    const first = plan.sources[0]!
    rmSync(resolve(sourceRoot, first.metadataPath))
    expect(await plan.validateSources(sourceRoot)).toContain(
      `missing source metadata ${first.metadataPath}`,
    )
    writeFileSync(resolve(sourceRoot, first.metadataPath), JSON.stringify({
      asset_id: 'wrong-id',
      export: { master: `${first.sourceId}_master.webp` },
    }))
    expect(await plan.validateSources(sourceRoot)).toContain(
      `${first.metadataPath} asset_id must be ${first.metadataAssetId}`,
    )

    const second = plan.sources[1]!
    writeFileSync(resolve(sourceRoot, second.metadataPath), JSON.stringify({
      asset_id: 'wrong-id',
      export: { master: `${second.sourceId}_master.webp` },
    }))
    expect(await plan.validateSources(sourceRoot)).toContain(
      'duplicate metadata asset_id wrong-id',
    )

    writeFileSync(resolve(sourceRoot, first.metadataPath), JSON.stringify({
      asset_id: first.metadataAssetId,
      export: { master: 'wrong_master.webp' },
    }))
    expect(await plan.validateSources(sourceRoot)).toContain(
      `${first.metadataPath} export.master must be ${first.sourceId}_master.webp`,
    )

    const unknownPath = resolve(
      sourceRoot,
      'art/deliverables/panels/room_a/unknown_meta.json',
    )
    writeFileSync(unknownPath, JSON.stringify({ asset_id: 'unknown' }))
    expect(await plan.validateSources(sourceRoot)).toContain(
      'unknown source metadata art/deliverables/panels/room_a/unknown_meta.json',
    )
  } finally {
    rmSync(sourceRoot, { recursive: true, force: true })
  }
})

test('plans only preview and master copies within the runtime asset roots', () => {
  const plan = createRuntimeAssetPlan(repositoryRoot)

  expect(plan.copies).toHaveLength(176)
  for (const copy of plan.copies) {
    expect(copy.sourcePath).toMatch(/art\\deliverables|art\/deliverables/)
    expect(copy.targetPath).toMatch(
      /^content\/assets\/(common|adult)\//,
    )
  }
  expect(plan.copies.filter((copy) => copy.scope === 'background'))
    .toHaveLength(2)
  expect(plan.copies.filter((copy) => copy.scope === 'common'))
    .toHaveLength(150)
  expect(plan.copies.filter((copy) => copy.scope === 'adult'))
    .toHaveLength(24)
})

test('rejects traversal copy targets before runtime assets can mutate', () => {
  const plan = createRuntimeAssetPlan(repositoryRoot)
  const originalTarget = resolve(
    repositoryRoot,
    'content/assets/common/panels/a1_fuse_master.webp',
  )
  const originalBytes = readFileSync(originalTarget)
  const traversalCopy: PlannedCopy = {
    ...plan.copies[0]!,
    id: 'a1_fuse',
    targetPath: 'content/assets/common/panels/../a1_fuse_master.webp',
  }

  expect(() => assertRuntimeAssetCopyTargets(
    repositoryRoot,
    [traversalCopy],
  )).toThrow('runtime copy target escapes common root')
  expect(readFileSync(originalTarget)).toEqual(originalBytes)
})

test('synchronizes deterministic runtime assets and manifests', () => {
  const sync = runRuntimeAssetCommand('--write')

  expect(sync.status).toBe(0)
  expect(sync.stdout).toContain(
    '75 common assets, 12 adult assets, 2 backgrounds',
  )
  expect(existsSync(resolve(
    repositoryRoot,
    'content/assets/common/panels/a1_fuse_master.webp',
  ))).toBe(true)
  expect(existsSync(resolve(
    repositoryRoot,
    'content/assets/adult/a_intimacy_01_master.webp',
  ))).toBe(true)
  expect(JSON.parse(readFileSync(resolve(
    repositoryRoot,
    'content/asset-manifest.json',
  ), 'utf8'))).toMatchObject({
    schemaVersion: 2,
    mode: 'playable',
    backgrounds: {
      building_a: '/assets/common/backgrounds/building_a_master.webp',
    },
    assets: {
      a1_fuse: {
        preview: '/assets/common/panels/a1_fuse_preview.webp',
      },
    },
  })
  expect(JSON.parse(readFileSync(resolve(
    repositoryRoot,
    'content/adult-asset-manifest.json',
  ), 'utf8'))).toMatchObject({
    schemaVersion: 1,
    assets: {
      a_intimacy_01: {
        full: '/assets/adult/a_intimacy_01_master.webp',
      },
    },
  })
  expect(JSON.parse(readFileSync(resolve(
    repositoryRoot,
    'content/runtime-assets.lock.json',
  ), 'utf8'))).toMatchObject({
    schemaVersion: 1,
    assets: expect.arrayContaining([
      expect.objectContaining({
        id: 'a1_fuse',
        sourceId: 'a1_fuse',
        metadataAssetId: 'card-a1_fuse',
        targetSha256: expect.objectContaining({
          preview: expect.stringMatching(/^[a-f0-9]{64}$/),
          full: expect.stringMatching(/^[a-f0-9]{64}$/),
        }),
      }),
    ]),
  })

  const check = runRuntimeAssetCommand('--check')
  expect(check.status).toBe(0)
  expect(check.stdout).toContain('runtime assets are in sync')
})

test('--check validates committed runtime bytes without a source checkout', () => {
  expect(runRuntimeAssetCommand('--write').status).toBe(0)
  const absentParent = mkdtempSync(
    resolve(tmpdir(), 'building-art-absent-parent-'),
  )
  const absentRoot = resolve(absentParent, 'missing')
  try {
    const result = runRuntimeAssetCommand('--check', absentRoot)
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('committed runtime lock')
  } finally {
    rmSync(absentParent, { recursive: true, force: true })
  }
})

test('--check rejects a partially present source checkout', () => {
  const partialRoot = mkdtempSync(resolve(tmpdir(), 'building-art-partial-'))
  try {
    const source = createRuntimeAssetPlan(repositoryRoot).sources[0]!
    mkdirSync(dirname(resolve(partialRoot, source.masterPath)), {
      recursive: true,
    })
    writeFileSync(resolve(partialRoot, source.masterPath), 'partial')
    const result = runRuntimeAssetCommand('--check', partialRoot)
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('partially present')
  } finally {
    rmSync(partialRoot, { recursive: true, force: true })
  }
})

test('--check without sources rejects target and lock hash mutations', () => {
  expect(runRuntimeAssetCommand('--write').status).toBe(0)
  const absentParent = mkdtempSync(
    resolve(tmpdir(), 'building-art-lock-parent-'),
  )
  const absentRoot = resolve(absentParent, 'missing')
  const target = resolve(
    repositoryRoot,
    'content/assets/common/panels/a1_fuse_master.webp',
  )
  const lockPath = resolve(repositoryRoot, 'content/runtime-assets.lock.json')
  const targetBytes = readFileSync(target)
  const lockBytes = readFileSync(lockPath)
  try {
    writeFileSync(target, 'mutated target')
    expect(runRuntimeAssetCommand('--check', absentRoot).status).toBe(1)
    writeFileSync(target, targetBytes)

    const lock = JSON.parse(lockBytes.toString('utf8'))
    lock.assets[0].targetSha256.full = '0'.repeat(64)
    writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`)
    expect(runRuntimeAssetCommand('--check', absentRoot).status).toBe(1)
  } finally {
    writeFileSync(target, targetBytes)
    writeFileSync(lockPath, lockBytes)
    rmSync(absentParent, { recursive: true, force: true })
    expect(runRuntimeAssetCommand('--check').status).toBe(0)
  }
})

test('--check rejects a manifest mismatch and restores the generated tree', () => {
  assertCheckFailsAfter(() => {
    writeFileSync(
      resolve(repositoryRoot, 'content/asset-manifest.json'),
      '{"outOfSync":true}\n',
    )
  })
})

test('--check rejects a missing runtime target and restores the generated tree', () => {
  assertCheckFailsAfter(() => {
    rmSync(resolve(
      repositoryRoot,
      'content/assets/common/panels/a1_fuse_master.webp',
    ))
  })
})

test('--check rejects an unexpected runtime target and restores the generated tree', () => {
  assertCheckFailsAfter(() => {
    writeFileSync(resolve(
      repositoryRoot,
      'content/assets/common/panels/unexpected.webp',
    ), 'unexpected')
  })
})

test('--check rejects a byte-mismatched runtime target and restores the generated tree', () => {
  assertCheckFailsAfter(() => {
    copyFileSync(
      resolve(repositoryRoot,
        'content/assets/common/panels/a1_door_master.webp'),
      resolve(repositoryRoot,
        'content/assets/common/panels/a1_fuse_master.webp'),
    )
  })
})
