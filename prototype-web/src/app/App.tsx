import { useEffect, useState } from 'react'
import { useAppStore } from './store'
import {
  loadCharacters,
  loadGallery,
  loadRoom,
} from '@/domain/repository'
import type {
  CharacterDefinition,
  GalleryEntry,
  RoomDefinition,
} from '@/domain/types'
import { BuildingScreen } from '@/screens/BuildingScreen'
import { ComicScreen } from '@/screens/ComicScreen'
import { GalleryScreen } from '@/screens/GalleryScreen'
import { ResultScreen } from '@/screens/ResultScreen'
import { RoomBriefScreen } from '@/screens/RoomBriefScreen'
import { SettingsScreen } from '@/screens/SettingsScreen'
import '@/styles/building.css'

interface RoomBriefRouteProps {
  roomId: string
  onBack(): void
  onStart(roomId: string): void
}

interface BriefContent {
  room: RoomDefinition
  characters: CharacterDefinition[]
}

function RoomBriefRoute({
  roomId,
  onBack,
  onStart,
}: RoomBriefRouteProps) {
  const progress = useAppStore((state) => state.progress)
  const [content, setContent] = useState<BriefContent | null>(
    null,
  )
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setContent(null)
    setError(null)

    void Promise.all([
      loadRoom(roomId),
      loadCharacters(),
    ]).then(
      ([room, characters]) => {
        if (active) setContent({ room, characters })
      },
      () => {
        if (active) {
          setError('房間資料載入失敗，請返回大樓重試。')
        }
      },
    )

    return () => {
      active = false
    }
  }, [roomId])

  if (error) {
    return (
      <section className="room-brief-screen" role="alert">
        <p>{error}</p>
        <button type="button" onClick={onBack}>
          返回大樓
        </button>
      </section>
    )
  }

  if (!content) {
    return (
      <section
        className="room-brief-screen"
        data-testid="app-loading"
        aria-label="載入房間資料"
      >
        載入中
      </section>
    )
  }

  return (
    <RoomBriefScreen
      room={content.room}
      characters={content.characters}
      progress={progress}
      onStart={() => onStart(roomId)}
      onBack={onBack}
    />
  )
}

function GalleryRoute({
  onBack,
}: {
  onBack(): void
}) {
  const progress = useAppStore((state) => state.progress)
  const [entries, setEntries] = useState<GalleryEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setEntries(null)
    setError(null)

    void loadGallery().then(
      (galleryEntries) => {
        if (active) setEntries(galleryEntries)
      },
      () => {
        if (active) setError('圖鑑資料載入失敗，請返回大樓重試。')
      },
    )

    return () => {
      active = false
    }
  }, [])

  if (error) {
    return (
      <section className="gallery-screen" role="alert">
        <p>{error}</p>
        <button type="button" onClick={onBack}>
          返回大樓
        </button>
      </section>
    )
  }

  if (!entries) {
    return (
      <section
        className="gallery-screen"
        data-testid="app-loading"
        aria-label="載入圖鑑資料"
      >
        載入中
      </section>
    )
  }

  return (
    <GalleryScreen
      entries={entries}
      progress={progress}
      onBack={onBack}
    />
  )
}

export function App() {
  const screen = useAppStore((state) => state.screen)
  const selectedRoomId = useAppStore(
    (state) => state.selectedRoomId,
  )
  const progress = useAppStore((state) => state.progress)
  const goTo = useAppStore((state) => state.goTo)
  const selectRoom = useAppStore((state) => state.selectRoom)
  const startRoom = useAppStore((state) => state.startRoom)
  const engine = useAppStore((state) => state.engine)
  const settledResult = useAppStore(
    (state) => state.settledResult,
  )
  const updateSetting = useAppStore(
    (state) => state.updateSetting,
  )
  const resumeCurrentRun = useAppStore(
    (state) => state.resumeCurrentRun,
  )
  const error = useAppStore((state) => state.error)
  const retryError = useAppStore((state) => state.retryError)

  useEffect(() => {
    if (progress.currentRun && !engine) {
      void resumeCurrentRun()
    }
  }, [engine, progress.currentRun, resumeCurrentRun])

  let content
  switch (screen) {
    case 'building':
      content = (
        <BuildingScreen
          progress={progress}
          onOpenRoom={selectRoom}
          onOpenGallery={() => goTo('gallery')}
          onOpenSettings={() => goTo('settings')}
        />
      )
      break
    case 'roomBrief':
      content = selectedRoomId
        ? (
            <RoomBriefRoute
              roomId={selectedRoomId}
              onBack={() => goTo('building')}
              onStart={(roomId) => {
                void startRoom(roomId)
              }}
            />
          )
        : (
            <BuildingScreen
              progress={progress}
              onOpenRoom={selectRoom}
              onOpenGallery={() => goTo('gallery')}
              onOpenSettings={() => goTo('settings')}
            />
          )
      break
    case 'comic':
      content = selectedRoomId
        ? <ComicScreen roomId={selectedRoomId} />
        : (
            <BuildingScreen
              progress={progress}
              onOpenRoom={selectRoom}
              onOpenGallery={() => goTo('gallery')}
              onOpenSettings={() => goTo('settings')}
            />
          )
      break
    case 'result':
      content = engine && settledResult
        ? (
            <ResultScreen
              room={engine.room}
              result={settledResult}
              stats={engine.snapshot.stats}
              progress={progress}
              onReplay={() => {
                void startRoom(settledResult.roomId)
              }}
              onReturn={() => goTo('building')}
            />
          )
        : (
            <BuildingScreen
              progress={progress}
              onOpenRoom={selectRoom}
              onOpenGallery={() => goTo('gallery')}
              onOpenSettings={() => goTo('settings')}
            />
          )
      break
    case 'gallery':
      content = (
        <GalleryRoute
          onBack={() => goTo('building')}
        />
      )
      break
    case 'settings':
      content = (
        <SettingsScreen
          progress={progress}
          onSettingChange={updateSetting}
          onBack={() => goTo('building')}
        />
      )
      break
  }

  return (
    <main className="app-shell">
      {error && (
        <aside className="app-error" role="alert">
          <p>{error.message}</p>
          <button type="button" onClick={retryError}>
            {error.actionLabel}
          </button>
        </aside>
      )}
      {content}
    </main>
  )
}
