import { expect, test } from 'vitest'
import { createAppStore } from '@/app/store'
import type {
  PlaytestEventType,
  PlaytestPayloadMap,
  PlaytestRecorder,
} from '@/analytics/playtest-log'
import {
  createEmptyProgress,
  saveProgress,
  type StorageAdapter,
} from '@/domain/progress'
import type { RoomDefinition } from '@/domain/types'

interface RecordedCall {
  type: PlaytestEventType
  payload: PlaytestPayloadMap[PlaytestEventType]
}

function createRecorder() {
  const calls: RecordedCall[] = []
  const recorder: PlaytestRecorder = {
    record(type, payload) {
      calls.push({
        type,
        payload: payload as PlaytestPayloadMap[PlaytestEventType],
      })
    },
  }

  return { calls, recorder }
}

function createStorage(): StorageAdapter {
  const values = new Map<string, string>()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value)
    },
  }
}

function createRoom(): RoomDefinition {
  const nodes: RoomDefinition['nodes'] = {}
  const panels: RoomDefinition['panels'] = {}

  for (let step = 1; step <= 6; step += 1) {
    const panelIds = [
      `p${step}a`,
      `p${step}b`,
      `p${step}c`,
    ] as [string, string, string]
    nodes[`n${step}`] = { candidates: panelIds }
    for (const panelId of panelIds) {
      panels[panelId] = {
        next: step === 6 ? 'ending' : `n${step + 1}`,
        previewAsset: panelId,
        actionLabel: panelId,
        dialogue: ['Fixture dialogue'],
      }
    }
  }

  const ending = {
    title: 'Fixture ending',
    asset: 'fixture-ending',
    clueIds: [],
    galleryUnlocks: [],
  }
  return {
    schemaVersion: 1,
    id: 'fixture-room',
    title: 'Fixture room',
    startNode: 'n1',
    safeNode: 'n1',
    endingAnchor: 'ending',
    nodes,
    panels,
    endingRules: [
      { id: 'normal', priority: 100, conditions: {} },
    ],
    endingContent: {
      main: ending,
      normal: ending,
      intimacy: ending,
    },
  }
}

test('records the complete play path through the injected recorder boundary', async () => {
  const room = createRoom()
  const storage = createStorage()
  const { calls, recorder } = createRecorder()
  const store = createAppStore({
    storage,
    loadRoom: async () => room,
    recorder,
  })

  expect(calls).toEqual([
    { type: 'session_started', payload: {} },
    {
      type: 'screen_viewed',
      payload: { screen: 'building' },
    },
  ])

  store.getState().selectRoom(room.id)
  await store.getState().startRoom(room.id)
  expect(calls).toContainEqual({
    type: 'screen_viewed',
    payload: { screen: 'roomBrief', roomId: room.id },
  })
  expect(calls).toContainEqual({
    type: 'screen_viewed',
    payload: { screen: 'comic', roomId: room.id },
  })
  expect(calls.filter(({ type }) => type === 'candidate_shown'))
    .toEqual([
      {
        type: 'candidate_shown',
        payload: { roomId: room.id, panelId: 'p1a', step: 1 },
      },
      {
        type: 'candidate_shown',
        payload: { roomId: room.id, panelId: 'p1b', step: 1 },
      },
      {
        type: 'candidate_shown',
        payload: { roomId: room.id, panelId: 'p1c', step: 1 },
      },
    ])

  for (let step = 1; step <= 6; step += 1) {
    store.getState().choosePanel(`p${step}a`)
    expect(calls).toContainEqual({
      type: 'choice_made',
      payload: {
        roomId: room.id,
        panelId: `p${step}a`,
        step,
      },
    })
    store.getState().finishReveal()
    if (step < 6) {
      expect(calls.slice(-3)).toEqual([
        {
          type: 'candidate_shown',
          payload: {
            roomId: room.id,
            panelId: `p${step + 1}a`,
            step: step + 1,
          },
        },
        {
          type: 'candidate_shown',
          payload: {
            roomId: room.id,
            panelId: `p${step + 1}b`,
            step: step + 1,
          },
        },
        {
          type: 'candidate_shown',
          payload: {
            roomId: room.id,
            panelId: `p${step + 1}c`,
            step: step + 1,
          },
        },
      ])
    }
  }

  expect(calls).toContainEqual({
    type: 'ending_reached',
    payload: {
      roomId: room.id,
      endingId: 'normal',
      choiceCount: 6,
    },
  })
  expect(calls).toContainEqual({
    type: 'screen_viewed',
    payload: { screen: 'result', roomId: room.id },
  })

  await store.getState().startRoom(room.id)
  expect(calls).toContainEqual({
    type: 'replay_started',
    payload: { roomId: room.id },
  })

  store.getState().goTo('gallery')
  expect(calls.slice(-2)).toEqual([
    {
      type: 'screen_viewed',
      payload: { screen: 'gallery' },
    },
    { type: 'gallery_opened', payload: {} },
  ])
})

test('records the visible candidate set when resuming a saved run', async () => {
  const room = createRoom()
  const storage = createStorage()
  const progress = createEmptyProgress()
  progress.currentRun = {
    roomId: room.id,
    snapshot: {
      roomId: room.id,
      currentNode: 'n2',
      choiceCount: 1,
      chosenPanels: ['p1a'],
      stats: { affection: 0, trust: 0, intimacy: 0 },
      flags: {},
    },
  }
  saveProgress(storage, progress)
  const { calls, recorder } = createRecorder()
  const store = createAppStore({
    storage,
    loadRoom: async () => room,
    recorder,
  })

  await store.getState().resumeCurrentRun()

  expect(calls.slice(-4)).toEqual([
    {
      type: 'screen_viewed',
      payload: { screen: 'comic', roomId: room.id },
    },
    {
      type: 'candidate_shown',
      payload: { roomId: room.id, panelId: 'p2a', step: 2 },
    },
    {
      type: 'candidate_shown',
      payload: { roomId: room.id, panelId: 'p2b', step: 2 },
    },
    {
      type: 'candidate_shown',
      payload: { roomId: room.id, panelId: 'p2c', step: 2 },
    },
  ])
})

test('records the locked candidate set visible during an unfinished reveal', async () => {
  const room = createRoom()
  const storage = createStorage()
  const progress = createEmptyProgress()
  progress.currentRun = {
    roomId: room.id,
    lockedPanelId: 'p1a',
    snapshot: {
      roomId: room.id,
      currentNode: 'n2',
      choiceCount: 1,
      chosenPanels: ['p1a'],
      stats: { affection: 0, trust: 0, intimacy: 0 },
      flags: {},
    },
  }
  saveProgress(storage, progress)
  const { calls, recorder } = createRecorder()
  const store = createAppStore({
    storage,
    loadRoom: async () => room,
    recorder,
  })

  await store.getState().resumeCurrentRun()

  expect(calls.slice(-4)).toEqual([
    {
      type: 'screen_viewed',
      payload: { screen: 'comic', roomId: room.id },
    },
    {
      type: 'candidate_shown',
      payload: { roomId: room.id, panelId: 'p1a', step: 1 },
    },
    {
      type: 'candidate_shown',
      payload: { roomId: room.id, panelId: 'p1b', step: 1 },
    },
    {
      type: 'candidate_shown',
      payload: { roomId: room.id, panelId: 'p1c', step: 1 },
    },
  ])
})
