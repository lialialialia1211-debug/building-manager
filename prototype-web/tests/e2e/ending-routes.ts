export type EndingId = 'main' | 'intimacy' | 'normal'

type RoomId = 'room_a_blackout' | 'room_b_wall'
type RoomLabel = 'Room A' | 'Room B'
type SafeResultAssetId = 'a_safe_01' | 'b_safe_01'

export interface EndingRoute {
  roomId: RoomId
  roomLabel: RoomLabel
  roomName: RegExp
  endingId: EndingId
  heading: string
  dealSeed: string
  panels: readonly [string, string, string, string, string, string]
  safeResultAssetId?: SafeResultAssetId
}

export const roomARoutes: readonly EndingRoute[] = [
  {
    roomId: 'room_a_blackout',
    roomLabel: 'Room A',
    roomName: /停電之夜/,
    endingId: 'main',
    heading: '藏在停電後的線索',
    dealSeed: '00000000-0000-4000-8000-000000000011',
    panels: [
      'a1_fuse',
      'a2f_tools',
      'a3_trace',
      'a4_ground',
      'a5_photo',
      'a6_report',
    ],
  },
  {
    roomId: 'room_a_blackout',
    roomLabel: 'Room A',
    roomName: /停電之夜/,
    endingId: 'intimacy',
    heading: '停電之夜的承諾',
    dealSeed: '00000000-0000-4000-8000-000000000018',
    panels: [
      'a1_door',
      'a2d_listen',
      'a3_share',
      'a4_comfort',
      'a5_ask',
      'a6_consent',
    ],
    safeResultAssetId: 'a_safe_01',
  },
  {
    roomId: 'room_a_blackout',
    roomLabel: 'Room A',
    roomName: /停電之夜/,
    endingId: 'normal',
    heading: '天亮之前',
    dealSeed: '00000000-0000-4000-8000-000000001652',
    panels: [
      'a1_note',
      'a2n_wait',
      'a3_candle',
      'a4_sleep',
      'a5_ignore',
      'a6_morning',
    ],
  },
]

export const roomBRoutes: readonly EndingRoute[] = [
  {
    roomId: 'room_b_wall',
    roomLabel: 'Room B',
    roomName: /牆後的聲音/,
    endingId: 'main',
    heading: '牆後的空間',
    dealSeed: '00000000-0000-4000-8000-000000000904',
    panels: [
      'b1_glass',
      'b2g_record',
      'b3_blueprint',
      'b4_measure',
      'b5_record',
      'b6_open',
    ],
  },
  {
    roomId: 'room_b_wall',
    roomLabel: 'Room B',
    roomName: /牆後的聲音/,
    endingId: 'intimacy',
    heading: '牆邊的約定',
    dealSeed: '00000000-0000-4000-8000-000000000041',
    panels: [
      'b1_neighbor',
      'b2n_hall',
      'b3_share',
      'b4_comfort',
      'b5_ask',
      'b6_consent',
    ],
    safeResultAssetId: 'b_safe_01',
  },
  {
    roomId: 'room_b_wall',
    roomLabel: 'Room B',
    roomName: /牆後的聲音/,
    endingId: 'normal',
    heading: '聲音沉寂之後',
    dealSeed: '00000000-0000-4000-8000-000000000806',
    panels: [
      'b1_glass',
      'b2g_cover',
      'b3_music',
      'b4_leave',
      'b5_ignore',
      'b6_sleep',
    ],
  },
]

export const endingRoutes: readonly EndingRoute[] = [
  ...roomARoutes,
  ...roomBRoutes,
]
