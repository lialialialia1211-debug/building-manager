import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, expect, test } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '@/app/App'
import { useAppStore } from '@/app/store'
import { parseRoom } from '@/domain/content-schema'
import { greyboxPanel } from '@/domain/greybox-assets'
import { createEmptyProgress } from '@/domain/progress'
import { markRead, wasRead } from '@/domain/read-history'
import { StoryEngine } from '@/domain/story-engine'
import type { RoomDefinition } from '@/domain/types'
import { ComicScreen } from '@/screens/ComicScreen'

const comicCss = readFileSync(
  resolve(process.cwd(), 'src/styles/comic.css'),
  'utf8',
)

const roomB = parseRoom(JSON.parse(readFileSync(
  resolve(process.cwd(), '../content/rooms/room_b_wall.json'),
  'utf8',
)))

function fireAnimationEnd(
  element: Element,
  animationName: string,
): void {
  const event = new Event('webkitAnimationEnd', {
    bubbles: true,
  })
  Object.defineProperty(event, 'animationName', {
    value: animationName,
  })
  fireEvent(element, event)
}

const emptyEnding = {
  title: 'Fixture ending',
  asset: 'ending-fixture',
  clueIds: [] as string[],
  galleryUnlocks: [] as string[],
}

const room = {
  schemaVersion: 1,
  id: 'room_a_blackout',
  title: '停電之夜',
  startNode: 'n1',
  safeNode: 'n1',
  endingAnchor: 'ending',
  nodes: {
    n1: { candidates: ['a1_door', 'a1_fuse', 'a1_note'] },
    n2: { candidates: ['a3_trace', 'a3_share', 'a3_candle'] },
  },
  panels: {
    a1_door: {
      next: 'n2',
      previewAsset: 'a1_door',
      actionLabel: '查看門口',
      dialogue: ['林雨薇壓低聲音問：「是誰？」'],
      effects: { trust: 1 },
      setFlags: ['a_found_note'],
    },
    a1_fuse: {
      next: 'n2',
      previewAsset: 'a1_fuse',
      actionLabel: '檢查配電箱',
      dialogue: ['保險絲旁閃過一道不自然的藍光。'],
    },
    a1_note: {
      next: 'n2',
      previewAsset: 'a1_note',
      actionLabel: '拾起紙條',
      dialogue: ['紙條上的墨跡仍帶著潮氣。'],
    },
    a3_trace: {
      next: 'ending',
      previewAsset: 'a3_trace',
      actionLabel: '留在原地',
      dialogue: ['牆上的線條在燭光下連成一個符號。'],
    },
    a3_share: {
      next: 'ending',
      previewAsset: 'a3_share',
      actionLabel: '觀察走廊',
      dialogue: ['走廊盡頭傳來電流重新接通的聲音。'],
    },
    a3_candle: {
      next: 'ending',
      previewAsset: 'a3_candle',
      actionLabel: '撥打電話',
      dialogue: ['電話另一端只剩下規律的雜音。'],
    },
  },
  endingRules: [
    { id: 'intimacy', priority: 300, conditions: {} },
    { id: 'main', priority: 200, conditions: {} },
    { id: 'normal', priority: 100, conditions: {} },
  ],
  endingContent: {
    intimacy: emptyEnding,
    main: emptyEnding,
    normal: emptyEnding,
  },
} as RoomDefinition

beforeEach(() => {
  localStorage.clear()
  useAppStore.setState({
    screen: 'comic',
    selectedRoomId: room.id,
    progress: createEmptyProgress(),
    engine: new StoryEngine(room),
    choiceLocked: false,
    revealedPanelId: null,
  })
})

afterEach(() => {
  useAppStore.setState({
    screen: 'building',
    selectedRoomId: null,
    progress: createEmptyProgress(),
    engine: null,
    choiceLocked: false,
    revealedPanelId: null,
  })
})

test('renders exactly three neutral candidate actions with decorative images', () => {
  const { container } = render(<ComicScreen roomId={room.id} />)
  const candidates = screen.getAllByRole('button', {
    name: /^選擇行動：/,
  })

  expect(candidates).toHaveLength(3)
  expect(candidates[0]).toHaveAccessibleName('選擇行動：查看門口')
  expect(candidates[1]).toHaveAccessibleName(
    '選擇行動：檢查配電箱',
  )
  expect(candidates[2]).toHaveAccessibleName('選擇行動：拾起紙條')

  for (const candidate of candidates) {
    expect(candidate.getAttribute('aria-label')).not.toMatch(
      /a1_|main|normal|intimacy|\d+\s*[+-]?/,
    )
  }
  for (const image of container.querySelectorAll(
    '.candidate-card img',
  )) {
    expect(image).toHaveAttribute('alt', '')
  }
})

test('locks all three candidates immediately after selection', async () => {
  const user = userEvent.setup()
  render(<ComicScreen roomId={room.id} />)
  const candidates = screen.getAllByRole('button', {
    name: /^選擇行動：/,
  })

  await user.click(candidates[0]!)

  for (const candidate of candidates) {
    expect(candidate).toBeDisabled()
  }
  expect(useAppStore.getState()).toMatchObject({
    choiceLocked: true,
    revealedPanelId: 'a1_door',
  })
})

test('hides dialogue and consequences before selection then reveals them in a live region', async () => {
  const user = userEvent.setup()
  render(<ComicScreen roomId={room.id} />)

  expect(
    screen.queryByText('林雨薇壓低聲音問：「是誰？」'),
  ).not.toBeInTheDocument()
  expect(screen.queryByText('信任上升')).not.toBeInTheDocument()
  expect(screen.queryByText(/發現神祕留言/)).not.toBeInTheDocument()

  await user.click(screen.getByRole('button', {
    name: '選擇行動：查看門口',
  }))

  const reveal = screen.getByRole('status', { name: '分鏡揭曉' })
  expect(reveal).toHaveAttribute('aria-live', 'polite')
  expect(reveal).toHaveTextContent('林雨薇壓低聲音問：「是誰？」')
  expect(reveal).toHaveTextContent('信任上升')
  expect(reveal).toHaveTextContent('事件更新：發現神祕留言')
  expect(reveal).not.toHaveTextContent('+1')
  expect(reveal).not.toHaveTextContent(/a_found_note|a1_door/)
})

test('shows numeric reveal deltas only when exact stats are enabled', async () => {
  const user = userEvent.setup()
  const progress = createEmptyProgress()
  progress.settings.exactStats = true
  useAppStore.setState({ progress })
  render(<ComicScreen roomId={room.id} />)

  await user.click(screen.getByRole('button', {
    name: '選擇行動：查看門口',
  }))

  expect(screen.getByRole('status', {
    name: '分鏡揭曉',
  })).toHaveTextContent('信任上升（+1）')
})

test('completes a reveal from the outer motion event and exposes its step marker', async () => {
  const user = userEvent.setup()
  render(<ComicScreen roomId={room.id} />)

  await user.click(screen.getAllByRole('button', {
    name: /^選擇行動：/,
  })[0]!)
  const motion = screen.getByTestId('panel-motion')

  expect(motion).toHaveStyle({
    '--reveal-duration': '2200ms',
  })
  expect(screen.queryByTestId('reveal-complete')).not.toBeInTheDocument()

  fireAnimationEnd(motion, 'panel-settle')

  expect(screen.getByTestId('reveal-complete')).toHaveAttribute(
    'data-step',
    '1',
  )
  expect(useAppStore.getState()).toMatchObject({
    choiceLocked: false,
    revealedPanelId: null,
  })
  expect(wasRead(
    useAppStore.getState().progress.readHistory,
    'a1_door',
    'default',
  )).toBe(true)
})

test('fast-forwards a read dialogue variant', async () => {
  const user = userEvent.setup()
  const progress = createEmptyProgress()
  progress.readHistory = markRead(
    progress.readHistory,
    'a1_door',
    'default',
  )
  useAppStore.setState({ progress })
  render(<ComicScreen roomId={room.id} />)

  await user.click(screen.getAllByRole('button', {
    name: /^選擇行動：/,
  })[0]!)

  expect(screen.getByTestId('panel-motion')).toHaveStyle({
    '--reveal-duration': '280ms',
  })
})

test('uses unread speed when the same panel has a new dialogue variant', async () => {
  const user = userEvent.setup()
  const variantRoom = structuredClone(room)
  variantRoom.panels.a1_door!.dialogueVariant = 'cross_room'
  const progress = createEmptyProgress()
  progress.readHistory = markRead(
    progress.readHistory,
    'a1_door',
    'default',
  )
  useAppStore.setState({
    progress,
    engine: new StoryEngine(variantRoom),
  })
  render(<ComicScreen roomId={room.id} />)

  await user.click(screen.getAllByRole('button', {
    name: /^選擇行動：/,
  })[0]!)

  expect(screen.getByTestId('panel-motion')).toHaveStyle({
    '--reveal-duration': '2200ms',
  })
})

test('uses the circuit visual and unread cross-room speed in Room B', async () => {
  const user = userEvent.setup()
  const progress = createEmptyProgress()
  progress.crossRoomFlags.a_hidden_circuit = true
  progress.readHistory = markRead(
    progress.readHistory,
    'b1_glass',
    'default',
  )
  useAppStore.setState({
    selectedRoomId: roomB.id,
    progress,
    engine: new StoryEngine(roomB, progress.crossRoomFlags),
  })
  render(<ComicScreen roomId={roomB.id} />)

  expect(screen.getByTestId('comic-screen')).toHaveAttribute(
    'data-room-visual-variant',
    'circuit',
  )

  await user.click(screen.getAllByRole('button', {
    name: /^選擇行動：/,
  })[0]!)

  expect(screen.getByTestId('panel-motion')).toHaveStyle({
    '--reveal-duration': '2200ms',
  })
  expect(screen.getByRole('status', {
    name: '分鏡揭曉',
  })).toHaveTextContent('停電房保存的六拍電流波形')
  expect(screen.getByRole('status', {
    name: '分鏡揭曉',
  })).not.toHaveTextContent('玻璃杯貼上牆面')
})

test('marks effective cross-room dialogue without marking default', async () => {
  const user = userEvent.setup()
  const progress = createEmptyProgress()
  progress.crossRoomFlags.a_hidden_circuit = true
  useAppStore.setState({
    selectedRoomId: roomB.id,
    progress,
    engine: new StoryEngine(roomB, progress.crossRoomFlags),
  })
  render(<ComicScreen roomId={roomB.id} />)

  await user.click(screen.getAllByRole('button', {
    name: /^選擇行動：/,
  })[0]!)
  fireAnimationEnd(
    screen.getByTestId('panel-motion'),
    'panel-settle',
  )

  expect(wasRead(
    useAppStore.getState().progress.readHistory,
    'b1_glass',
    'cross_room',
  )).toBe(true)
  expect(wasRead(
    useAppStore.getState().progress.readHistory,
    'b1_glass',
    'default',
  )).toBe(false)
})

test('defines the circuit-light overlay in comic CSS', () => {
  expect(comicCss).toMatch(
    /\.comic-screen\[data-room-visual-variant="circuit"\]::before/,
  )
})

test('shows six choice slots between fixed opening and ending anchors', () => {
  render(<ComicScreen roomId={room.id} />)

  expect(screen.getByText('步驟 1 / 6')).toBeInTheDocument()
  expect(screen.getByTestId('comic-opening')).toHaveClass(
    'comic-panel-opening',
  )
  expect(screen.getAllByTestId('comic-choice-slot')).toHaveLength(6)
  expect(screen.getByTestId('comic-ending')).toHaveClass(
    'comic-panel-ending',
  )
  expect(screen.getByTestId('status-strip')).toBeInTheDocument()
})

test('uses semantic panel modifiers instead of test ids for layout CSS', () => {
  expect(comicCss).toMatch(/\.comic-panel-opening/)
  expect(comicCss).toMatch(/\.comic-panel-ending/)
  expect(comicCss).not.toMatch(
    /\.comic-panel\[data-testid="comic-(?:opening|ending)"\]/,
  )
})

test('lays out the six choice slots across the full comic page', () => {
  const choiceGridRule = comicCss.match(
    /\.comic-choice-grid\s*\{(?<declarations>[^}]*)\}/,
  )?.groups?.declarations

  expect(choiceGridRule).toMatch(/grid-column:\s*1\s*\/\s*-1/)
  expect(choiceGridRule).toMatch(/display:\s*grid/)
  expect(choiceGridRule).toMatch(
    /grid-template-columns:\s*repeat\(\s*6,\s*minmax\(0,\s*1fr\)\s*\)/,
  )
})

test('uses the formal comic screen for the comic app route', () => {
  render(<App />)

  expect(screen.getByTestId('comic-screen')).toBeInTheDocument()
  expect(screen.getAllByRole('button', {
    name: /^選擇行動：/,
  })).toHaveLength(3)
})

test('keeps panel ids out of playtest greyboxes', () => {
  const playtestImage = decodeURIComponent(
    greyboxPanel('a1_door', 0, false),
  )
  const developerImage = decodeURIComponent(
    greyboxPanel('a1_door', 0, true),
  )

  expect(playtestImage).not.toContain('a1_door')
  expect(playtestImage).toMatch(/<circle|<path|<rect/)
  expect(developerImage).toContain('a1_door')
})
