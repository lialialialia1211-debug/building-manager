import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createEmptyProgress } from '@/domain/progress'
import type { AssetCatalog } from '@/domain/runtime-assets'
import type {
  CharacterDefinition,
  RoomDefinition,
} from '@/domain/types'
import { RoomBriefScreen } from '@/screens/RoomBriefScreen'

const emptyEnding = {
  title: 'Fixture ending',
  asset: 'ending-fixture',
  clueIds: [] as string[],
  galleryUnlocks: [] as string[],
}

const room: RoomDefinition = {
  schemaVersion: 1,
  id: 'room_a_blackout',
  title: '停電之夜',
  backgroundAsset: 'building_a',
  openingAssets: ['a_open_01', 'a_open_02', 'a_open_03'],
  startNode: 'n1',
  safeNode: 'n1',
  endingAnchor: 'ending',
  nodes: {
    n1: { candidates: ['p1', 'p2', 'p3'] },
  },
  panels: {
    p1: {
      next: 'ending',
      previewAsset: 'p1',
      dialogue: ['Fixture dialogue'],
      actionLabel: '查看門口',
    },
    p2: {
      next: 'ending',
      previewAsset: 'p2',
      dialogue: ['Fixture dialogue'],
      actionLabel: '檢查桌面',
    },
    p3: {
      next: 'ending',
      previewAsset: 'p3',
      dialogue: ['Fixture dialogue'],
      actionLabel: '留在原地',
    },
  },
  endingRules: [
    { id: 'intimacy', priority: 300, conditions: {} },
    { id: 'main', priority: 200, conditions: {} },
    { id: 'normal', priority: 100, conditions: {} },
  ],
  endingContent: {
    intimacy: emptyEnding,
    main: {
      ...emptyEnding,
      clueIds: [
        'a_hidden_circuit',
        'a_symbol_traced',
        'a_evidence',
        'a_consent',
        'unmapped_fixture_clue',
      ],
    },
    normal: emptyEnding,
  },
}

const catalog: AssetCatalog = {
  common: Object.fromEntries(
    room.openingAssets.map((assetId) => [
      assetId,
      {
        preview: `/art/${assetId}-preview.webp`,
        full: `/art/${assetId}-full.webp`,
      },
    ]),
  ),
  adult: null,
  backgrounds: { building_a: '/art/building-a.webp' },
}

const characters: CharacterDefinition[] = [
  {
    id: 'lin_yuwei',
    displayName: '林雨薇',
    age: 28,
    ageStatus: 'adult',
    roomId: room.id,
  },
  {
    id: 'chen_haoran',
    displayName: '陳皓然',
    age: 31,
    ageStatus: 'adult',
    roomId: room.id,
  },
  {
    id: 'someone_else',
    displayName: '其他住戶',
    age: 35,
    ageStatus: 'adult',
    roomId: 'room_b_wall',
  },
]

test('shows room details, found clues, and three unknown endings', () => {
  const progress = createEmptyProgress()
  progress.clues = [
    'a_hidden_circuit',
    'a_symbol_traced',
    'a_evidence',
    'a_consent',
    'unmapped_fixture_clue',
  ]

  render(
    <RoomBriefScreen
      room={room}
      catalog={catalog}
      characters={characters}
      progress={progress}
      onStart={() => {}}
      onBack={() => {}}
    />,
  )

  expect(
    screen.getByRole('heading', { name: '停電之夜' }),
  ).toBeInTheDocument()
  expect(screen.getByText('林雨薇，28 歲')).toBeInTheDocument()
  expect(screen.getByText('陳皓然，31 歲')).toBeInTheDocument()
  expect(screen.queryByText(/其他住戶/)).not.toBeInTheDocument()
  expect(
    screen.getByText(/停電後.*異常配電箱.*神祕留言/),
  ).toBeInTheDocument()
  expect(screen.getByText('圖紙外的隱藏迴路')).toBeInTheDocument()
  expect(screen.getByText('描下神祕符號')).toBeInTheDocument()
  expect(screen.getByText('停電異常證據')).toBeInTheDocument()
  expect(screen.getByText('相互同意的承諾')).toBeInTheDocument()
  expect(screen.getByText('未知線索')).toBeInTheDocument()
  expect(
    screen.queryByText(/a_hidden_circuit|unmapped_fixture_clue/),
  ).not.toBeInTheDocument()
  expect(screen.getAllByText('未知結局')).toHaveLength(3)
  expect(
    screen.getByRole('button', { name: '開始' }),
  ).toBeInTheDocument()
  expect(screen.getByRole('img', { name: '停電之夜房間背景' }))
    .toHaveAttribute('src', '/art/building-a.webp')
  expect(screen.getAllByRole('img', { name: /開場預覽/ }))
    .toHaveLength(3)
  expect(document.body.innerHTML).not.toContain('data:image/svg+xml')
})

test('offers replay after the room has a completed ending', () => {
  const progress = createEmptyProgress()
  progress.completedEndings[room.id] = ['main']

  render(
    <RoomBriefScreen
      room={room}
      catalog={catalog}
      characters={characters}
      progress={progress}
      onStart={() => {}}
      onBack={() => {}}
    />,
  )

  expect(
    screen.getByRole('button', { name: '重新遊玩' }),
  ).toBeInTheDocument()
  expect(screen.getAllByText('未知結局')).toHaveLength(3)
  expect(screen.queryByText('Fixture ending')).not.toBeInTheDocument()
})

test('shows Room B clue labels without internal IDs', () => {
  const roomB: RoomDefinition = {
    ...room,
    id: 'room_b_wall',
    title: '牆後的聲音',
    endingContent: {
      ...room.endingContent,
      main: {
        ...emptyEnding,
        clueIds: [
          'b_hidden_space',
          'b_evidence',
          'b_opened_space',
          'b_consent',
        ],
      },
    },
  }
  const progress = createEmptyProgress()
  progress.clues = [
    'b_hidden_space',
    'b_evidence',
    'b_opened_space',
    'b_consent',
  ]

  render(
    <RoomBriefScreen
      room={roomB}
      catalog={{
        ...catalog,
        backgrounds: {
          ...catalog.backgrounds,
          building_b: '/art/building-b.webp',
        },
      }}
      characters={characters}
      progress={progress}
      onStart={() => {}}
      onBack={() => {}}
    />,
  )

  expect(screen.getByText('牆後的隱藏空間')).toBeInTheDocument()
  expect(screen.getByText('牆後異常證據')).toBeInTheDocument()
  expect(screen.getByText('已開啟隱藏空間')).toBeInTheDocument()
  expect(screen.getByText('相互同意的約定')).toBeInTheDocument()
  expect(
    screen.queryByText(
      /b_hidden_space|b_evidence|b_opened_space|b_consent/,
    ),
  ).not.toBeInTheDocument()
})

test('retries a failed room briefing background', async () => {
  const user = userEvent.setup()
  render(
    <RoomBriefScreen
      room={room}
      catalog={catalog}
      characters={characters}
      progress={createEmptyProgress()}
      onStart={() => {}}
      onBack={() => {}}
    />,
  )

  fireEvent.error(
    screen.getByRole('img', { name: '停電之夜房間背景' }),
  )

  await user.click(screen.getByRole('button', { name: '重試' }))
  expect(screen.getByRole('img', { name: '停電之夜房間背景' }))
    .toHaveAttribute(
      'src',
      '/art/building-a.webp?runtimeRetry=1',
    )
})
