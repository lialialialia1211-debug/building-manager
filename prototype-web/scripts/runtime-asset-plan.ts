import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { isAbsolute, relative, resolve } from 'node:path'

export type AssetVariant = 'preview' | 'full'

export interface RuntimeAssetEntry {
  preview: string
  full: string
}

export interface PlannedCopy {
  id: string
  scope: 'common' | 'adult' | 'background'
  variant: AssetVariant | 'background'
  sourcePath: string
  targetPath: string
}

export interface PlannedSourceAsset {
  id: string
  scope: PlannedCopy['scope']
  sourceId: string
  directory: string
  masterPath: string
  previewPath: string
  metadataPath: string
  metadataAssetId: string
}

export interface RuntimeAssetPlan {
  common: Record<string, RuntimeAssetEntry>
  adult: Record<string, RuntimeAssetEntry>
  backgrounds: Record<string, string>
  copies: PlannedCopy[]
  sources: PlannedSourceAsset[]
  validateSources(sourceRoot: string): string[]
}

const canonicalAssetIdPattern = /^[a-z][a-z0-9_]*$/

function isWithin(root: string, path: string): boolean {
  const pathFromRoot = relative(root, path)
  return pathFromRoot === '' || (
    !pathFromRoot.startsWith('..') && !isAbsolute(pathFromRoot)
  )
}

export function assertRuntimeAssetCopyTargets(
  repoRoot: string,
  copies: readonly PlannedCopy[],
): void {
  const commonPanelsRoot = resolve(
    repoRoot,
    'content/assets/common/panels',
  )
  const commonBackgroundsRoot = resolve(
    repoRoot,
    'content/assets/common/backgrounds',
  )
  const adultRoot = resolve(repoRoot, 'content/assets/adult')

  for (const copy of copies) {
    if (!canonicalAssetIdPattern.test(copy.id)) {
      throw new Error(`invalid runtime asset ID ${copy.id}`)
    }

    const target = copy.scope === 'common'
      ? {
          root: commonPanelsRoot,
          path: `content/assets/common/panels/${copy.id}_${
            copy.variant === 'full' ? 'master' : 'preview'
          }.webp`,
        }
      : copy.scope === 'background'
        ? {
            root: commonBackgroundsRoot,
            path: `content/assets/common/backgrounds/${copy.id}_master.webp`,
          }
        : {
            root: adultRoot,
            path: `content/assets/adult/${copy.id}_${
              copy.variant === 'full' ? 'master' : 'preview'
            }.webp`,
          }
    const resolvedTarget = resolve(repoRoot, copy.targetPath)

    if (!isWithin(target.root, resolvedTarget)) {
      throw new Error(
        `runtime copy target escapes ${copy.scope} root: ${copy.targetPath}`,
      )
    }
    if (copy.targetPath !== target.path || resolvedTarget !== resolve(
      repoRoot,
      target.path,
    )) {
      throw new Error(`invalid runtime copy target ${copy.targetPath}`)
    }
    if (
      (copy.scope === 'background' && copy.variant !== 'background')
      || (copy.scope !== 'background' && copy.variant === 'background')
    ) {
      throw new Error(`invalid runtime asset variant for ${copy.id}`)
    }
  }
}

interface RoomFile {
  panels: Record<string, unknown>
}

function readRoomPanelIds(repoRoot: string): string[] {
  const roomsDirectory = resolve(repoRoot, 'content/rooms')
  const panelIds = new Set<string>()

  for (const roomFile of readdirSync(roomsDirectory)
    .filter((file) => file.endsWith('.json'))
    .sort()) {
    const room = JSON.parse(readFileSync(
      resolve(roomsDirectory, roomFile),
      'utf8',
    )) as RoomFile
    for (const panelId of Object.keys(room.panels)) {
      panelIds.add(panelId)
    }
  }

  return [...panelIds].sort()
}

function roomDirectoryFor(id: string): 'room_a' | 'room_b' {
  if (id.startsWith('a')) {
    return 'room_a'
  }
  if (id.startsWith('b')) {
    return 'room_b'
  }
  throw new Error(`cannot determine room source directory for ${id}`)
}

function panelEntry(path: string): RuntimeAssetEntry {
  return {
    preview: `/assets/${path}_preview.webp`,
    full: `/assets/${path}_master.webp`,
  }
}

const metadataPrefixAnomalies = new Set([
  'a1_fuse',
  'a2d_chain',
  'a4_comfort',
  'b1_glass',
  'b2n_hall',
  'b6_open',
])

function expectedMetadataAssetId(
  id: string,
  scope: PlannedCopy['scope'],
  sourceId: string,
): string {
  if (scope === 'background') {
    return `bg-${sourceId.replace(/^bg_/, '')}`
  }
  return metadataPrefixAnomalies.has(id)
    ? `card-${sourceId}`
    : sourceId
}

function collectMetadataFiles(directory: string): string[] {
  if (!existsSync(directory)) return []
  const files: string[] = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...collectMetadataFiles(path))
    } else if (entry.isFile() && entry.name.endsWith('_meta.json')) {
      files.push(path)
    }
  }
  return files.sort()
}

function sourceRelativePath(sourceRoot: string, absolutePath: string): string {
  return relative(sourceRoot, absolutePath).replaceAll('\\', '/')
}

function validateSourceMetadata(
  sourceRoot: string,
  sources: readonly PlannedSourceAsset[],
): string[] {
  const errors: string[] = []
  const expectedMetadataPaths = new Set(
    sources.map((source) => source.metadataPath),
  )
  const actualMetadataPaths = [
    ...collectMetadataFiles(resolve(
      sourceRoot,
      'art/deliverables/panels',
    )),
    ...collectMetadataFiles(resolve(
      sourceRoot,
      'art/deliverables/backgrounds',
    )),
  ].map((path) => sourceRelativePath(sourceRoot, path))

  for (const path of actualMetadataPaths) {
    if (!expectedMetadataPaths.has(path)) {
      errors.push(`unknown source metadata ${path}`)
    }
  }

  const metadataIds = new Map<string, number>()
  for (const source of sources) {
    for (const [kind, path] of [
      ['master', source.masterPath],
      ['preview', source.previewPath],
      ['metadata', source.metadataPath],
    ] as const) {
      if (!existsSync(resolve(sourceRoot, path))) {
        errors.push(`missing source ${kind} ${path}`)
      }
    }

    const metadataPath = resolve(sourceRoot, source.metadataPath)
    if (!existsSync(metadataPath)) continue
    let metadata: Record<string, unknown>
    try {
      const parsed = JSON.parse(readFileSync(metadataPath, 'utf8'))
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('metadata must be an object')
      }
      metadata = parsed as Record<string, unknown>
    } catch {
      errors.push(`invalid source metadata ${source.metadataPath}`)
      continue
    }

    const assetId = metadata.asset_id
    if (typeof assetId !== 'string') {
      errors.push(`${source.metadataPath} asset_id must be a string`)
    } else {
      metadataIds.set(assetId, (metadataIds.get(assetId) ?? 0) + 1)
      if (assetId !== source.metadataAssetId) {
        errors.push(
          `${source.metadataPath} asset_id must be ${source.metadataAssetId}`,
        )
      }
    }

    const exported = metadata.export
    if (exported && typeof exported === 'object' && !Array.isArray(exported)) {
      const master = (exported as Record<string, unknown>).master
      if (master !== `${source.sourceId}_master.webp`) {
        errors.push(
          `${source.metadataPath} export.master must be ${source.sourceId}_master.webp`,
        )
      }
    } else {
      const selectedSource = metadata.source
      const allowedSourceIds = source.sourceId.endsWith('_poster_intimacy')
        ? [source.sourceId, source.sourceId.replace('poster_intimacy', 'safe_06')]
        : [source.sourceId]
      if (
        typeof selectedSource !== 'string'
        || !allowedSourceIds.some((id) => selectedSource.includes(id))
      ) {
        errors.push(
          `${source.metadataPath} must map its selected source to ${source.sourceId}`,
        )
      }
    }
  }

  for (const [assetId, count] of metadataIds) {
    if (count > 1) errors.push(`duplicate metadata asset_id ${assetId}`)
  }
  return errors
}

export function createRuntimeAssetPlan(repoRoot: string): RuntimeAssetPlan {
  const common: Record<string, RuntimeAssetEntry> = {}
  const adult: Record<string, RuntimeAssetEntry> = {}
  const backgrounds: Record<string, string> = {}
  const copies: PlannedCopy[] = []
  const sources: PlannedSourceAsset[] = []

  function addPanel(
    id: string,
    scope: 'common' | 'adult',
    sourceDirectory: string,
    sourceId = id,
  ): void {
    const entries = scope === 'common' ? common : adult
    if (entries[id]) {
      throw new Error(`duplicate runtime asset ID ${id}`)
    }

    const targetDirectory = scope === 'common'
      ? 'content/assets/common/panels'
      : 'content/assets/adult'
    const urlDirectory = scope === 'common'
      ? 'common/panels'
      : 'adult'

    entries[id] = panelEntry(`${urlDirectory}/${id}`)
    const directory = `panels/${sourceDirectory}`
    sources.push({
      id,
      scope,
      sourceId,
      directory,
      masterPath: `art/deliverables/${directory}/${sourceId}_master.webp`,
      previewPath: `art/deliverables/${directory}/${sourceId}_preview.webp`,
      metadataPath: `art/deliverables/${directory}/${sourceId}_meta.json`,
      metadataAssetId: expectedMetadataAssetId(id, scope, sourceId),
    })
    for (const [variant, suffix] of [
      ['preview', 'preview'],
      ['full', 'master'],
    ] as const) {
      copies.push({
        id,
        scope,
        variant,
        sourcePath: `art/deliverables/panels/${sourceDirectory}/${sourceId}_${suffix}.webp`,
        targetPath: `${targetDirectory}/${id}_${suffix}.webp`,
      })
    }
  }

  for (const panelId of readRoomPanelIds(repoRoot)) {
    addPanel(panelId, 'common', roomDirectoryFor(panelId))
  }

  for (const roomId of ['a', 'b'] as const) {
    for (const number of ['01', '02', '03']) {
      addPanel(`${roomId}_open_${number}`, 'common',
        roomDirectoryFor(roomId))
    }
    for (const ending of ['main', 'normal', 'intimacy']) {
      addPanel(
        `${roomId}_ending_${ending}`,
        'common',
        roomDirectoryFor(roomId),
        `${roomId}_poster_${ending}`,
      )
    }
    for (const number of ['01', '02', '03', '04', '05', '06']) {
      addPanel(`${roomId}_safe_${number}`, 'common', 'safe')
      addPanel(
        `${roomId}_intimacy_${number}`,
        'adult',
        'intimacy',
        `${roomId}_adult_${number}`,
      )
    }
  }

  for (const number of ['01', '02', '03']) {
    addPanel(`sixth_${number}`, 'common', 'sixth_room')
  }

  for (const [id, sourceId] of [
    ['building_a', 'bg_room_a'],
    ['building_b', 'bg_room_b'],
  ] as const) {
    backgrounds[id] = `/assets/common/backgrounds/${id}_master.webp`
    const directory = 'backgrounds'
    sources.push({
      id,
      scope: 'background',
      sourceId,
      directory,
      masterPath: `art/deliverables/${directory}/${sourceId}_master.webp`,
      previewPath: `art/deliverables/${directory}/${sourceId}_preview.webp`,
      metadataPath: `art/deliverables/${directory}/${sourceId}_meta.json`,
      metadataAssetId: expectedMetadataAssetId(
        id,
        'background',
        sourceId,
      ),
    })
    copies.push({
      id,
      scope: 'background',
      variant: 'background',
      sourcePath: `art/deliverables/backgrounds/${sourceId}_master.webp`,
      targetPath: `content/assets/common/backgrounds/${id}_master.webp`,
    })
  }

  sources.sort((left, right) => left.id.localeCompare(right.id))
  return {
    common,
    adult,
    backgrounds,
    copies,
    sources,
    validateSources: (sourceRoot) => validateSourceMetadata(
      sourceRoot,
      sources,
    ),
  }
}
