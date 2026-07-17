import {
  parseCharacters,
  parseGallery,
  parseRoom,
} from './content-schema'
import type {
  CharacterDefinition,
  GalleryEntry,
  RoomDefinition,
} from './types'

export function contentUrl(
  path: string,
  baseUrl = import.meta.env.BASE_URL,
): string {
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  return `${base}${path.replace(/^\/+/, '')}`
}

export async function loadRoom(
  roomId: string,
): Promise<RoomDefinition> {
  const response = await fetch(
    contentUrl(`rooms/${roomId}.json`),
  )
  if (!response.ok) {
    throw new Error(`room ${roomId} failed to load`)
  }

  const room = parseRoom(await response.json())
  if (room.id !== roomId) {
    throw new Error(
      `room id mismatch: requested ${roomId}, received ${room.id}`,
    )
  }
  return room
}

export async function loadCharacters(): Promise<
  CharacterDefinition[]
> {
  const response = await fetch(contentUrl('characters.json'))
  if (!response.ok) {
    throw new Error('characters failed to load')
  }

  return parseCharacters(await response.json())
}

export async function loadGallery(): Promise<GalleryEntry[]> {
  const response = await fetch(contentUrl('gallery.json'))
  if (!response.ok) {
    throw new Error('gallery failed to load')
  }

  return parseGallery(await response.json())
}
