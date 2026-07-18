import { useEffect, useMemo, useState } from 'react'
import { CinematicPlayer } from '@/components/CinematicPlayer'
import { buildEndingRecap } from '@/domain/ending-recap'
import { galleryEntryLabel } from '@/domain/gallery-labels'
import type { ProgressData } from '@/domain/progress'
import type { AssetCatalog } from '@/domain/runtime-assets'
import type { GalleryEntry, RoomDefinition } from '@/domain/types'

interface GalleryScreenProps {
  entries: GalleryEntry[]
  rooms: Record<string, RoomDefinition>
  progress: ProgressData
  catalog: AssetCatalog
  adultStatus: 'disabled' | 'loading' | 'ready' | 'error'
  onBack(): void
}

export function GalleryScreen({
  entries,
  rooms,
  progress,
  catalog,
  adultStatus,
  onBack,
}: GalleryScreenProps) {
  const unlockedIds = useMemo(() => entries
    .filter((entry) => progress.galleryUnlocks.includes(entry.id))
    .map((entry) => entry.id), [entries, progress.galleryUnlocks])
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(
    () => unlockedIds[0] ?? null,
  )

  useEffect(() => {
    if (!selectedEntryId || !unlockedIds.includes(selectedEntryId)) {
      setSelectedEntryId(unlockedIds[0] ?? null)
    }
  }, [selectedEntryId, unlockedIds])

  const selectedEntry = entries.find(
    (entry) => entry.id === selectedEntryId
      && unlockedIds.includes(entry.id),
  )
  const selectedRoom = selectedEntry
    ? rooms[selectedEntry.roomId]
    : undefined
  const selectedLabel = selectedEntry
    ? galleryEntryLabel(selectedEntry.roomId, selectedEntry.endingId)
    : ''
  const recap = selectedEntry && selectedRoom
    ? buildEndingRecap({
        room: selectedRoom,
        endingId: selectedEntry.endingId,
        savedRecap: progress.endingRecaps[selectedRoom.id]
          ?.[selectedEntry.endingId],
        galleryEntry: selectedEntry,
        adultContent: progress.settings.adultContent,
        adultCatalogReady: adultStatus === 'ready'
          && catalog.adult !== null,
        catalog,
      })
    : null

  return (
    <section
      className="gallery-screen"
      data-testid="gallery-screen"
      aria-labelledby="gallery-title"
    >
      <header className="utility-header">
        <div>
          <p>已完成結局</p>
          <h1 id="gallery-title">回想圖鑑</h1>
        </div>
        <button type="button" onClick={onBack}>
          返回大樓
        </button>
      </header>

      <div className="gallery-grid">
        {entries.map((entry) => {
          const unlocked = unlockedIds.includes(entry.id)
          const label = galleryEntryLabel(entry.roomId, entry.endingId)

          return (
            <article
              className={[
                'gallery-entry',
                unlocked ? 'gallery-entry-unlocked' : '',
                selectedEntryId === entry.id ? 'gallery-entry-selected' : '',
              ].filter(Boolean).join(' ')}
              key={entry.id}
            >
              <button
                type="button"
                disabled={!unlocked}
                aria-label={label}
                aria-pressed={unlocked
                  ? selectedEntryId === entry.id
                  : undefined}
                onClick={() => setSelectedEntryId(entry.id)}
              >
                {unlocked ? label : '尚未解鎖'}
              </button>
            </article>
          )
        })}
      </div>

      {recap && selectedEntry && (
        <div className="gallery-replay">
          <CinematicPlayer
            key={selectedEntry.id}
            assetIds={recap.assetIds}
            catalog={catalog}
            title={`${selectedLabel}回想`}
          />
          {recap.usedSafeFallback
            && progress.settings.adultContent
            && (
              <p className="ending-safe-fallback" role="status">
                成人美術暫時無法載入，此回想已改用安全版。
              </p>
            )}
        </div>
      )}

      {unlockedIds.length === 0 && (
        <p className="gallery-empty" role="status">
          完成結局後，可在此播放回想。
        </p>
      )}
    </section>
  )
}
