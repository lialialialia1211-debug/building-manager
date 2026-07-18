import { useEffect, useState } from 'react'
import { useAppStore } from './store'
import { OpeningSequence } from '@/components/OpeningSequence'
import {
  loadCharacters,
  loadGallery,
  loadRoom,
} from '@/domain/repository'
import { useRuntimeAssets } from '@/hooks/use-runtime-assets'
import type { AssetCatalog } from '@/domain/runtime-assets'
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
  catalog: AssetCatalog | null
  onBack(): void
  onStart(roomId: string): void
}

interface BriefContent {
  room: RoomDefinition
  characters: CharacterDefinition[]
}

function RoomBriefRoute({
  roomId,
  catalog,
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
      catalog={catalog ?? undefined}
      onStart={() => onStart(roomId)}
      onBack={onBack}
    />
  )
}

function GalleryRoute({
  catalog,
  onBack,
}: {
  catalog: AssetCatalog | null
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

  if (!entries || !catalog) {
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
      catalog={catalog}
      onBack={onBack}
    />
  )
}

function ArtLoading({ label }: { label: string }) {
  return (
    <section
      className="art-loading"
      data-testid="art-loading"
      role="status"
      aria-label={label}
    >
      {label}
    </section>
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
  const openingPending = useAppStore((state) => state.openingPending)
  const finishOpening = useAppStore((state) => state.finishOpening)
  const error = useAppStore((state) => state.error)
  const retryError = useAppStore((state) => state.retryError)

  const {
    catalog,
    commonStatus,
    adultStatus,
    retryCommon,
    retryAdult,
  } = useRuntimeAssets(progress.settings.adultContent)

  useEffect(() => {
    if (progress.currentRun && !engine) {
      void resumeCurrentRun()
    }
  }, [engine, progress.currentRun, resumeCurrentRun])

  const buildingScreen = (
    <BuildingScreen
      progress={progress}
      catalog={catalog ?? undefined}
      onOpenRoom={selectRoom}
      onOpenGallery={() => goTo('gallery')}
      onOpenSettings={() => goTo('settings')}
    />
  )

  let content
  switch (screen) {
    case 'building':
      content = buildingScreen
      break
    case 'roomBrief':
      content = selectedRoomId
        ? (
            <RoomBriefRoute
              roomId={selectedRoomId}
              catalog={catalog}
              onBack={() => goTo('building')}
              onStart={(roomId) => {
                void startRoom(roomId)
              }}
            />
          )
        : buildingScreen
      break
    case 'comic':
      if (!selectedRoomId) {
        content = buildingScreen
      } else if (!catalog) {
        content = <ArtLoading label="正在載入房間美術" />
      } else if (
        openingPending
        && engine
        && (engine.room.openingAssets?.length ?? 0) > 0
      ) {
        content = (
          <OpeningSequence
            title={engine.room.title}
            assetIds={engine.room.openingAssets ?? []}
            dialogue={engine.room.openingDialogue ?? []}
            catalog={catalog}
            onComplete={finishOpening}
          />
        )
      } else {
        content = <ComicScreen roomId={selectedRoomId} catalog={catalog} />
      }
      break
    case 'result':
      content = engine && settledResult
        ? catalog
          ? (
              <ResultScreen
                room={engine.room}
                result={settledResult}
                stats={engine.snapshot.stats}
                progress={progress}
                catalog={catalog}
                adultStatus={adultStatus}
                onReplay={() => {
                  void startRoom(settledResult.roomId)
                }}
                onReturn={() => goTo('building')}
              />
            )
          : <ArtLoading label="正在載入結局美術" />
        : buildingScreen
      break
    case 'gallery':
      content = (
        <GalleryRoute
          catalog={catalog}
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
      {commonStatus === 'error' && (
        <aside className="app-error" role="alert">
          <p>美術資源載入失敗，暫時無法開始遊戲。</p>
          <button type="button" onClick={retryCommon}>
            重新載入美術
          </button>
        </aside>
      )}
      {adultStatus === 'error' && (
        <aside className="app-notice" role="status">
          <p>成人美術暫時無法載入，已改用安全版。</p>
          <button type="button" onClick={retryAdult}>
            重試載入成人美術
          </button>
        </aside>
      )}
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
