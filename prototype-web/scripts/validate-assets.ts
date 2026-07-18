import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  validateAdultAssetManifest,
  validateAssetManifest,
} from '../src/domain/asset-manifest'
import {
  parseGallery,
  parseRoom,
} from '../src/domain/content-schema'

const here = fileURLToPath(new URL('.', import.meta.url))
const contentRoot = resolve(here, '../../content')
const repositoryRoot = resolve(here, '../..')

function readJson(path: string): unknown {
  return JSON.parse(
    readFileSync(resolve(contentRoot, path), 'utf8'),
  )
}

const rooms = [
  'room_a_blackout',
  'room_b_wall',
].map((roomId) =>
  parseRoom(readJson(`rooms/${roomId}.json`)))
const choicePanelIds = rooms.flatMap((room) => [
    ...new Set(
      Object.values(room.nodes).flatMap(
        (node) => node.candidates,
      ),
    ),
  ])
const gallery = parseGallery(readJson('gallery.json'))

const result = validateAssetManifest(
  readJson('asset-manifest.json'),
  choicePanelIds,
  {
    rooms,
    gallery,
    pathExists: (path) =>
      existsSync(resolve(repositoryRoot, path)),
  },
)
const adultErrors = validateAdultAssetManifest(
  readJson('adult-asset-manifest.json'),
)

const errors = [...result.errors, ...adultErrors]
if (errors.length > 0) {
  for (const error of errors) {
    console.error(error)
  }
  process.exitCode = 1
} else if (result.mode === 'greybox') {
  console.log(
    'asset-manifest: greybox mode, formal art files are not required',
  )
} else if (result.mode === 'playable') {
  console.log(
    'asset-manifest: playable runtime catalogs valid, 75 common assets, 12 adult assets, 2 backgrounds',
  )
} else {
  console.log(
    'asset-manifest: formal package valid, 87 panels, 20 layered packages',
  )
}
