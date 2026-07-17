import type { StorageAdapter } from '@/domain/progress'

export const PLAYTEST_LOG_KEY = 'building-manager-playtest-v1'

export const PLAYTEST_EVENT_TYPES = [
  'session_started',
  'screen_viewed',
  'candidate_shown',
  'choice_made',
  'ending_reached',
  'replay_started',
  'gallery_opened',
] as const

const PLAYTEST_SCREENS = [
  'building',
  'roomBrief',
  'comic',
  'result',
  'gallery',
  'settings',
] as const

const PLAYTEST_ENDINGS = [
  'main',
  'normal',
  'intimacy',
] as const

const PLAYTEST_ROOMS = [
  'room_a_blackout',
  'room_b_wall',
] as const

export const PLAYTEST_PANEL_IDS = [
  'a1_door',
  'a1_fuse',
  'a1_note',
  'a2d_open',
  'a2d_chain',
  'a2d_listen',
  'a2f_reset',
  'a2f_tools',
  'a2f_call',
  'a2n_follow',
  'a2n_photo',
  'a2n_wait',
  'a3_trace',
  'a3_share',
  'a3_candle',
  'a4_ground',
  'a4_comfort',
  'a4_sleep',
  'a5_photo',
  'a5_ask',
  'a5_ignore',
  'a6_report',
  'a6_consent',
  'a6_morning',
  'b1_glass',
  'b1_knock',
  'b1_neighbor',
  'b2g_mark',
  'b2g_record',
  'b2g_cover',
  'b2k_pattern',
  'b2k_reply',
  'b2k_stop',
  'b2n_invite',
  'b2n_hall',
  'b2n_refuse',
  'b3_blueprint',
  'b3_share',
  'b3_music',
  'b4_measure',
  'b4_comfort',
  'b4_leave',
  'b5_record',
  'b5_ask',
  'b5_ignore',
  'b6_open',
  'b6_consent',
  'b6_sleep',
] as const

const ROOM_SCREENS: readonly PlaytestScreen[] = [
  'roomBrief',
  'comic',
  'result',
]

const SESSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export type PlaytestEventType =
  typeof PLAYTEST_EVENT_TYPES[number]

export type PlaytestScreen = typeof PLAYTEST_SCREENS[number]
export type PlaytestEnding = typeof PLAYTEST_ENDINGS[number]

type EmptyPayload = Record<string, never>

export interface PlaytestPayloadMap {
  session_started: EmptyPayload
  screen_viewed: {
    screen: PlaytestScreen
    roomId?: string
  }
  candidate_shown: {
    roomId: string
    panelId: string
    step: number
  }
  choice_made: {
    roomId: string
    panelId: string
    step: number
  }
  ending_reached: {
    roomId: string
    endingId: PlaytestEnding
    choiceCount: number
  }
  replay_started: {
    roomId: string
  }
  gallery_opened: EmptyPayload
}

export type PlaytestEvent = {
  [Type in PlaytestEventType]: {
    sessionId: string
    timestampMs: number
    type: Type
    payload: PlaytestPayloadMap[Type]
  }
}[PlaytestEventType]

export interface PlaytestRecorder {
  record<Type extends PlaytestEventType>(
    type: Type,
    payload: PlaytestPayloadMap[Type],
  ): void
}

export interface PlaytestExporter {
  exportBlob(): Blob
}

interface StoredPlaytestLog {
  version: 1
  events: PlaytestEvent[]
}

export class PlaytestLog
implements PlaytestRecorder, PlaytestExporter {
  private readonly eventLog: PlaytestEvent[]

  constructor(
    private readonly sessionId: string,
    private readonly now: () => number = Date.now,
    private readonly storage: StorageAdapter = localStorage,
  ) {
    if (!isSessionId(sessionId)) {
      throw new TypeError(
        'sessionId must be an anonymous UUID',
      )
    }
    this.eventLog = loadStoredEvents(storage)
  }

  get events(): readonly PlaytestEvent[] {
    return this.eventLog
  }

  record<Type extends PlaytestEventType>(
    type: Type,
    payload: PlaytestPayloadMap[Type],
  ): void {
    if (!isOneOf(type, PLAYTEST_EVENT_TYPES)) {
      throw new TypeError('event type is not approved')
    }
    const event = {
      sessionId: this.sessionId,
      timestampMs: this.now(),
      type,
      payload: sanitizePayload(type, payload),
    } as PlaytestEvent
    this.eventLog.push(event)
    this.persist()
  }

  exportBlob(): Blob {
    return new Blob([
      JSON.stringify(this.serializedLog(), null, 2),
    ], {
      type: 'application/json',
    })
  }

  private persist(): void {
    try {
      this.storage.setItem(
        PLAYTEST_LOG_KEY,
        JSON.stringify(this.serializedLog()),
      )
    } catch {
      // Keep the in-memory local log usable if browser storage is unavailable.
    }
  }

  private serializedLog(): StoredPlaytestLog {
    return {
      version: 1,
      events: this.eventLog,
    }
  }
}

export function createAnonymousSessionId(): string {
  return globalThis.crypto.randomUUID()
}

export const defaultPlaytestRecorder = new PlaytestLog(
  createAnonymousSessionId(),
)

function sanitizePayload<Type extends PlaytestEventType>(
  type: Type,
  payload: PlaytestPayloadMap[Type],
): PlaytestPayloadMap[Type] {
  const values = payload as Record<string, unknown>
  let sanitized: PlaytestPayloadMap[PlaytestEventType]

  switch (type) {
    case 'session_started':
    case 'gallery_opened':
      sanitized = {}
      break
    case 'screen_viewed': {
      const screen = requireEnum(
        values.screen,
        PLAYTEST_SCREENS,
        'screen',
      )
      const roomId = ROOM_SCREENS.includes(screen)
        ? requireRoomId(values.roomId)
        : rejectUnexpectedRoomId(values.roomId)
      sanitized = roomId === undefined
        ? { screen }
        : { screen, roomId }
      break
    }
    case 'candidate_shown':
    case 'choice_made':
      sanitized = {
        roomId: requireRoomId(values.roomId),
        panelId: requirePanelId(values.panelId),
        step: requireIntegerInRange(values.step, 'step', 1, 6),
      }
      break
    case 'ending_reached':
      sanitized = {
        roomId: requireRoomId(values.roomId),
        endingId: requireEnum(
          values.endingId,
          PLAYTEST_ENDINGS,
          'endingId',
        ),
        choiceCount: requireIntegerInRange(
          values.choiceCount,
          'choiceCount',
          1,
          6,
        ),
      }
      break
    case 'replay_started':
      sanitized = {
        roomId: requireRoomId(values.roomId),
      }
      break
  }

  return sanitized as PlaytestPayloadMap[Type]
}

function loadStoredEvents(storage: StorageAdapter): PlaytestEvent[] {
  try {
    const raw = storage.getItem(PLAYTEST_LOG_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!isStoredPlaytestLog(parsed)) return []
    return structuredClone(parsed.events)
  } catch {
    return []
  }
}

function isStoredPlaytestLog(
  value: unknown,
): value is StoredPlaytestLog {
  return (
    isRecord(value)
    && hasOnlyKeys(value, ['version', 'events'])
    && value.version === 1
    && Array.isArray(value.events)
    && value.events.every(isPlaytestEvent)
  )
}

function isPlaytestEvent(value: unknown): value is PlaytestEvent {
  if (
    !isRecord(value)
    || !hasOnlyKeys(
      value,
      ['sessionId', 'timestampMs', 'type', 'payload'],
    )
    || !isSessionId(value.sessionId)
    || !Number.isFinite(value.timestampMs)
    || !isOneOf(value.type, PLAYTEST_EVENT_TYPES)
    || !isRecord(value.payload)
  ) {
    return false
  }

  return isStoredPayload(value.type, value.payload)
}

function isStoredPayload(
  type: PlaytestEventType,
  payload: Record<string, unknown>,
): boolean {
  switch (type) {
    case 'session_started':
    case 'gallery_opened':
      return hasOnlyKeys(payload, [])
    case 'screen_viewed':
      if (
        !hasOnlyKeys(payload, ['screen', 'roomId'])
        || !isOneOf(payload.screen, PLAYTEST_SCREENS)
      ) {
        return false
      }
      return ROOM_SCREENS.includes(payload.screen)
        ? isRoomId(payload.roomId)
        : payload.roomId === undefined
    case 'candidate_shown':
    case 'choice_made':
      return (
        hasOnlyKeys(payload, ['roomId', 'panelId', 'step'])
        && isRoomId(payload.roomId)
        && isPanelId(payload.panelId)
        && isIntegerInRange(payload.step, 1, 6)
      )
    case 'ending_reached':
      return (
        hasOnlyKeys(
          payload,
          ['roomId', 'endingId', 'choiceCount'],
        )
        && isRoomId(payload.roomId)
        && isOneOf(payload.endingId, PLAYTEST_ENDINGS)
        && isIntegerInRange(payload.choiceCount, 1, 6)
      )
    case 'replay_started':
      return (
        hasOnlyKeys(payload, ['roomId'])
        && isRoomId(payload.roomId)
      )
  }
}

function requireRoomId(value: unknown): string {
  if (!isRoomId(value)) {
    throw new TypeError('roomId is not an approved room id')
  }
  return value
}

function rejectUnexpectedRoomId(
  value: unknown,
): string | undefined {
  if (value !== undefined) {
    throw new TypeError(
      'roomId is not allowed for this screen',
    )
  }
  return undefined
}

function requirePanelId(value: unknown): string {
  if (!isPanelId(value)) {
    throw new TypeError('panelId is not an approved panel id')
  }
  return value
}

function requireIntegerInRange(
  value: unknown,
  field: string,
  minimum: number,
  maximum: number,
): number {
  if (!isIntegerInRange(value, minimum, maximum)) {
    throw new TypeError(
      `${field} must be an integer from ${minimum} to ${maximum}`,
    )
  }
  return value
}

function requireEnum<const Values extends readonly string[]>(
  value: unknown,
  allowed: Values,
  field: string,
): Values[number] {
  if (!isOneOf(value, allowed)) {
    throw new TypeError(`${field} is not an approved product id`)
  }
  return value
}

function isOneOf<const Values extends readonly string[]>(
  value: unknown,
  allowed: Values,
): value is Values[number] {
  return (
    typeof value === 'string'
    && (allowed as readonly string[]).includes(value)
  )
}

function isSessionId(value: unknown): value is string {
  return (
    typeof value === 'string'
    && SESSION_ID_PATTERN.test(value)
  )
}

function isRoomId(value: unknown): value is string {
  return isOneOf(value, PLAYTEST_ROOMS)
}

function isPanelId(value: unknown): value is string {
  return isOneOf(value, PLAYTEST_PANEL_IDS)
}

function isIntegerInRange(
  value: unknown,
  minimum: number,
  maximum: number,
): value is number {
  return (
    typeof value === 'number'
    && Number.isInteger(value)
    && value >= minimum
    && value <= maximum
  )
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
): boolean {
  return Object.keys(value).every((key) => allowed.includes(key))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    value !== null
    && typeof value === 'object'
    && !Array.isArray(value)
  )
}
