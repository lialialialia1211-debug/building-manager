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
}

export interface EndingRecap {
  assetIds: string[]
  usedSafeFallback: boolean
}

function roomAssetPrefix(
  room: RoomDefinition,
  endingId: EndingId,
): string {
  const marker = `_ending_${endingId}`
  const poster = room.endingContent[endingId].asset
  return poster.endsWith(marker)
    ? poster.slice(0, -marker.length)
    : room.openingAssets[0].split('_')[0] ?? ''
}

function generatedSequence(
  prefix: string,
  variant: 'intimacy' | 'safe',
): string[] {
  return Array.from(
    { length: 6 },
    (_, index) => `${prefix}_${variant}_0${index + 1}`,
  )
}

function sameRoomAssets(
  assetIds: readonly string[] | undefined,
  prefix: string,
): string[] {
  if (!assetIds) return []
  return assetIds.filter((assetId) => (
    assetId.startsWith(`${prefix}_`)
    && !assetId.toLowerCase().includes('/adult/')
  ))
}

export function buildEndingRecap({
  room,
  endingId,
  savedRecap,
  galleryEntry,
  adultContent,
  adultCatalogReady,
}: EndingRecapRequest): EndingRecap {
  const poster = room.endingContent[endingId].asset

  if (endingId !== 'intimacy') {
    const authoredRecap = (savedRecap ?? []).filter(
      (panelId) => panelId in room.panels,
    )
    return {
      assetIds: [
        ...(authoredRecap.length > 0
          ? authoredRecap
          : room.openingAssets),
        poster,
      ],
      usedSafeFallback: false,
    }
  }

  const prefix = roomAssetPrefix(room, endingId)
  if (adultContent && adultCatalogReady) {
    const suppliedAdult = sameRoomAssets(
      galleryEntry?.adultSequence,
      prefix,
    )
    return {
      assetIds: [
        ...(suppliedAdult.length > 0
          ? suppliedAdult
          : generatedSequence(prefix, 'intimacy')),
        poster,
      ],
      usedSafeFallback: false,
    }
  }

  const suppliedSafe = sameRoomAssets(
    galleryEntry?.safeSequence,
    prefix,
  )
  return {
    assetIds: [
      ...(suppliedSafe.length > 0
        ? suppliedSafe
        : generatedSequence(prefix, 'safe')),
      poster,
    ],
    usedSafeFallback: true,
  }
}
