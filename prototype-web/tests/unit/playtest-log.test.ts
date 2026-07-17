import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from 'vitest'
import {
  PLAYTEST_EVENT_TYPES,
  PLAYTEST_LOG_KEY,
  PLAYTEST_PANEL_IDS,
  PlaytestLog,
} from '@/analytics/playtest-log'
import type { StorageAdapter } from '@/domain/progress'

const TEST_SESSION_ID = '550e8400-e29b-41d4-a716-446655440000'
const OLDER_SESSION_ID = '6ba7b810-9dad-41d1-80b4-00c04fd430c8'
const NEXT_SESSION_ID = '123e4567-e89b-42d3-a456-426614174000'

function createStorage(initial?: string): StorageAdapter {
  const values = new Map<string, string>()
  if (initial !== undefined) {
    values.set(PLAYTEST_LOG_KEY, initial)
  }

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value)
    },
  }
}

test('defines exactly the seven approved event types', () => {
  expect(PLAYTEST_EVENT_TYPES).toEqual([
    'session_started',
    'screen_viewed',
    'candidate_shown',
    'choice_made',
    'ending_reached',
    'replay_started',
    'gallery_opened',
  ])
})

test('records a sanitized typed choice and persists version 1 immediately', () => {
  const storage = createStorage()
  const log = new PlaytestLog(
    TEST_SESSION_ID,
    () => 1000,
    storage,
  )
  const unsafePayload = {
    roomId: 'room_a_blackout',
    panelId: 'a1_fuse',
    step: 1,
    dialogue: 'private dialogue',
    userInput: 'personal answer',
    browserFingerprint: 'fingerprint',
  }

  log.record('choice_made', unsafePayload)

  expect(log.events[0]).toEqual({
    sessionId: TEST_SESSION_ID,
    timestampMs: 1000,
    type: 'choice_made',
    payload: {
      roomId: 'room_a_blackout',
      panelId: 'a1_fuse',
      step: 1,
    },
  })
  expect(JSON.parse(
    storage.getItem(PLAYTEST_LOG_KEY) ?? '{}',
  )).toEqual({
    version: 1,
    events: log.events,
  })
})

test('loads valid local events and appends the new session event', () => {
  const storage = createStorage(JSON.stringify({
    version: 1,
    events: [
      {
        sessionId: OLDER_SESSION_ID,
        timestampMs: 500,
        type: 'screen_viewed',
        payload: { screen: 'building' },
      },
    ],
  }))
  const log = new PlaytestLog(
    NEXT_SESSION_ID,
    () => 1000,
    storage,
  )

  log.record('session_started', {})

  expect(log.events).toEqual([
    {
      sessionId: OLDER_SESSION_ID,
      timestampMs: 500,
      type: 'screen_viewed',
      payload: { screen: 'building' },
    },
    {
      sessionId: NEXT_SESSION_ID,
      timestampMs: 1000,
      type: 'session_started',
      payload: {},
    },
  ])
})

test.each([
  ['malformed JSON', '{'],
  ['unknown version', JSON.stringify({ version: 2, events: [] })],
  ['unapproved payload data', JSON.stringify({
    version: 1,
    events: [
      {
        sessionId: TEST_SESSION_ID,
        timestampMs: 1000,
        type: 'choice_made',
        payload: {
          roomId: 'room_a_blackout',
          panelId: 'a1_fuse',
          step: 1,
          dialogue: 'must not survive',
        },
      },
    ],
  })],
])('falls back to an empty log for %s', (_case, storedValue) => {
  const log = new PlaytestLog(
    NEXT_SESSION_ID,
    () => 1000,
    createStorage(storedValue),
  )

  expect(log.events).toEqual([])
})

test('exports the versioned local log as application/json', async () => {
  const log = new PlaytestLog(
    TEST_SESSION_ID,
    () => 1000,
    createStorage(),
  )
  log.record('gallery_opened', {})

  const blob = log.exportBlob()

  expect(blob.type).toBe('application/json')
  expect(JSON.parse(await blob.text())).toEqual({
    version: 1,
    events: log.events,
  })
})

test('rejects an unknown runtime event without persisting or exporting it', async () => {
  const storage = createStorage()
  const log = new PlaytestLog(
    TEST_SESSION_ID,
    () => 1000,
    storage,
  )

  expect(() => {
    log.record(
      'browser_fingerprint' as never,
      { value: 'device-123' } as never,
    )
  }).toThrow('event type is not approved')

  expect(log.events).toEqual([])
  expect(storage.getItem(PLAYTEST_LOG_KEY)).toBeNull()
  expect(JSON.parse(await log.exportBlob().text())).toEqual({
    version: 1,
    events: [],
  })
})

test.each([
  'test-session-alice',
  'test-session-johnsmith',
  'test-session-devicefingerprint',
  'person@example.com',
  'session with a name',
  'device-fingerprint-123',
])('rejects unsafe injected session id %s', (sessionId) => {
  expect(() => new PlaytestLog(
    sessionId,
    () => 1000,
    createStorage(),
  )).toThrow('sessionId must be an anonymous UUID')
})

test('accepts a production UUID session id', () => {
  expect(() => new PlaytestLog(
    TEST_SESSION_ID,
    () => 1000,
    createStorage(),
  )).not.toThrow()
})

test.each([
  [
    'session email',
    {
      sessionId: 'person@example.com',
      timestampMs: 500,
      type: 'screen_viewed',
      payload: { screen: 'building' },
    },
  ],
  [
    'text test session',
    {
      sessionId: 'test-session-alice',
      timestampMs: 500,
      type: 'screen_viewed',
      payload: { screen: 'building' },
    },
  ],
  [
    'room email',
    {
      sessionId: OLDER_SESSION_ID,
      timestampMs: 500,
      type: 'screen_viewed',
      payload: {
        screen: 'roomBrief',
        roomId: 'person@example.com',
      },
    },
  ],
  [
    'panel fingerprint',
    {
      sessionId: OLDER_SESSION_ID,
      timestampMs: 500,
      type: 'choice_made',
      payload: {
        roomId: 'room_a_blackout',
        panelId: 'a1_device_fingerprint',
        step: 1,
      },
    },
  ],
])('falls back when stored data contains PII in a legal key: %s', (
  _case,
  event,
) => {
  const log = new PlaytestLog(
    NEXT_SESSION_ID,
    () => 1000,
    createStorage(JSON.stringify({
      version: 1,
      events: [event],
    })),
  )

  expect(log.events).toEqual([])
})

test.each([
  [
    'roomId',
    'screen_viewed',
    { screen: 'roomBrief', roomId: 'person@example.com' },
  ],
  [
    'panelId',
    'choice_made',
    {
      roomId: 'room_a_blackout',
      panelId: 'a1_device_fingerprint',
      step: 1,
    },
  ],
  [
    'screen',
    'screen_viewed',
    { screen: 'settings for Alice' },
  ],
])('rejects unsafe %s in an approved payload key', (
  _field,
  eventType,
  payload,
) => {
  const storage = createStorage()
  const log = new PlaytestLog(
    TEST_SESSION_ID,
    () => 1000,
    storage,
  )

  expect(() => log.record(
    eventType as never,
    payload as never,
  )).toThrow()
  expect(log.events).toEqual([])
  expect(storage.getItem(PLAYTEST_LOG_KEY)).toBeNull()
})

test('panel whitelist exactly matches both room choice definitions', () => {
  const roomFiles = [
    'room_a_blackout.json',
    'room_b_wall.json',
  ]
  const contentPanelIds = roomFiles.flatMap((filename) => {
    const room = JSON.parse(readFileSync(
      resolve(process.cwd(), '../content/rooms', filename),
      'utf8',
    )) as {
      nodes: Record<string, { candidates: string[] }>
    }
    return Object.values(room.nodes).flatMap(
      ({ candidates }) => candidates,
    )
  })
  expect([...PLAYTEST_PANEL_IDS].sort()).toEqual(
    [...contentPanelIds].sort(),
  )
  expect(new Set(PLAYTEST_PANEL_IDS).size).toBe(48)
})
