import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

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

export interface RuntimeAssetPlan {
  common: Record<string, RuntimeAssetEntry>
  adult: Record<string, RuntimeAssetEntry>
  backgrounds: Record<string, string>
  copies: PlannedCopy[]
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

export function createRuntimeAssetPlan(repoRoot: string): RuntimeAssetPlan {
  const common: Record<string, RuntimeAssetEntry> = {}
  const adult: Record<string, RuntimeAssetEntry> = {}
  const backgrounds: Record<string, string> = {}
  const copies: PlannedCopy[] = []

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
    copies.push({
      id,
      scope: 'background',
      variant: 'background',
      sourcePath: `art/deliverables/backgrounds/${sourceId}_master.webp`,
      targetPath: `content/assets/common/backgrounds/${id}_master.webp`,
    })
  }

  return { common, adult, backgrounds, copies }
}
