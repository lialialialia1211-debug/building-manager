import type { AssetCatalog } from './runtime-assets'
import type {
  EndingId,
  GalleryEntry,
  RoomDefinition,
} from './types'

export interface EndingRecapRequest {
  room: RoomDefinition
  endingId: EndingId
  savedRecap?: readonly string[]
  galleryEntry?: GalleryEntry
  adultContent: boolean
  adultCatalogReady: boolean
  catalog: AssetCatalog
}

export interface EndingRecap {
  assetIds: string[]
  usedSafeFallback: boolean
}

function roomAssetPrefix(room: RoomDefinition): string {
  if (room.id === 'room_a_blackout') return 'a'
  if (room.id === 'room_b_wall') return 'b'
  return room.openingAssets[0].split('_')[0] ?? ''
}

function isCompleteSavedRecap(
  savedRecap: readonly string[] | undefined,
  room: RoomDefinition,
): savedRecap is readonly [string, string, string, string, string, string] {
  return savedRecap?.length === 6
    && new Set(savedRecap).size === 6
    && savedRecap.every((panelId) => panelId in room.panels)
}

function validAuthoredSequence(
  assetIds: readonly string[] | undefined,
  prefix: string,
  variant: 'safe' | 'intimacy',
  catalog: AssetCatalog,
): string[] | null {
  if (!assetIds || assetIds.length !== 6 || new Set(assetIds).size !== 6) {
    return null
  }
  const pattern = new RegExp(
    `^${prefix}_${variant}_[a-zA-Z0-9][a-zA-Z0-9_-]*$`,
  )
  const source = variant === 'safe' ? catalog.common : catalog.adult
  if (!source) return null
  if (assetIds.some((assetId) => !pattern.test(assetId) || !source[assetId])) {
    return null
  }
  return [...assetIds]
}

function matchingIntimacyEntry(
  entry: GalleryEntry | undefined,
  room: RoomDefinition,
): GalleryEntry | undefined {
  return entry?.roomId === room.id
    && entry.endingId === 'intimacy'
    && entry.adult
    ? entry
    : undefined
}

export function buildEndingRecap({
  room,
  endingId,
  savedRecap,
  galleryEntry,
  adultContent,
  adultCatalogReady,
  catalog,
}: EndingRecapRequest): EndingRecap {
  const poster = room.endingContent[endingId].asset

  if (endingId !== 'intimacy') {
    return {
      assetIds: [
        ...(isCompleteSavedRecap(savedRecap, room)
          ? savedRecap
          : room.openingAssets),
        poster,
      ],
      usedSafeFallback: false,
    }
  }

  const prefix = roomAssetPrefix(room)
  const authored = matchingIntimacyEntry(galleryEntry, room)
  const safeSequence = validAuthoredSequence(
    authored?.safeSequence,
    prefix,
    'safe',
    catalog,
  )
  if (adultContent && adultCatalogReady) {
    const adultSequence = validAuthoredSequence(
      authored?.adultSequence,
      prefix,
      'intimacy',
      catalog,
    )
    if (adultSequence) {
      return {
        assetIds: [...adultSequence, poster],
        usedSafeFallback: false,
      }
    }
  }

  return {
    assetIds: [
      ...(safeSequence ?? room.openingAssets),
      poster,
    ],
    usedSafeFallback: true,
  }
}
