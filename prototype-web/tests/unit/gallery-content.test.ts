import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from 'vitest'

test('gallery content defines the six approved ending entries', () => {
  const gallery = JSON.parse(readFileSync(
    resolve(process.cwd(), '../content/gallery.json'),
    'utf8',
  ))

  expect(gallery).toEqual([
    {
      id: 'room_a_main',
      roomId: 'room_a_blackout',
      endingId: 'main',
      adult: false,
    },
    {
      id: 'room_a_normal',
      roomId: 'room_a_blackout',
      endingId: 'normal',
      adult: false,
    },
    {
      id: 'room_a_intimacy',
      roomId: 'room_a_blackout',
      endingId: 'intimacy',
      adult: true,
      adultSequence: [
        'a_intimacy_01',
        'a_intimacy_02',
        'a_intimacy_03',
        'a_intimacy_04',
        'a_intimacy_05',
        'a_intimacy_06',
      ],
      safeSequence: [
        'a_safe_01',
        'a_safe_02',
        'a_safe_03',
        'a_safe_04',
        'a_safe_05',
        'a_safe_06',
      ],
    },
    {
      id: 'room_b_main',
      roomId: 'room_b_wall',
      endingId: 'main',
      adult: false,
    },
    {
      id: 'room_b_normal',
      roomId: 'room_b_wall',
      endingId: 'normal',
      adult: false,
    },
    {
      id: 'room_b_intimacy',
      roomId: 'room_b_wall',
      endingId: 'intimacy',
      adult: true,
      adultSequence: [
        'b_intimacy_01',
        'b_intimacy_02',
        'b_intimacy_03',
        'b_intimacy_04',
        'b_intimacy_05',
        'b_intimacy_06',
      ],
      safeSequence: [
        'b_safe_01',
        'b_safe_02',
        'b_safe_03',
        'b_safe_04',
        'b_safe_05',
        'b_safe_06',
      ],
    },
  ])
})
