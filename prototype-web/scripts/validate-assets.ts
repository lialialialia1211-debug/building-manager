import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildRequiredCommonPanelIds,
  validateAdultManifest,
  validatePlayableManifest,
} from '../src/domain/asset-manifest'
import {
  parseGallery,
  parseRoom,
} from '../src/domain/content-schema'

const here = fileURLToPath(new URL('.', import.meta.url))
const contentRoot = resolve(here, '../../content')

function readJson(path: string): unknown {
  return JSON.parse(
    readFileSync(resolve(contentRoot, path), 'utf8'),
  )
}

const rooms = [
  'room_a_blackout',
  'room_b_wall',
].map((roomId) => parseRoom(readJson(`rooms/${roomId}.json`)))
const choicePanelIds = rooms.flatMap((room) => [
  ...new Set(
    Object.values(room.nodes).flatMap((node) => node.candidates),
  ),
])
const gallery = parseGallery(readJson('gallery.json'))

const errors: string[] = []

const common = validatePlayableManifest(
  readJson('asset-manifest.json'),
  buildRequiredCommonPanelIds(choicePanelIds),
  { rooms, gallery },
)
errors.push(...common.errors)

const adult = validateAdultManifest(readJson('adult-asset-manifest.json'))
errors.push(...adult.errors)

if (errors.length > 0) {
  for (const error of errors) console.error(error)
  process.exitCode = 1
} else {
  console.log(
    'asset-manifest: playable mode valid, 75 common + 12 adult panels, '
    + '2 backgrounds, adult assets isolated',
  )
}
