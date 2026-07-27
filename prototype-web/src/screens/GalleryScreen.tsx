import { useState } from 'react'
import { CinematicPlayer } from '@/components/CinematicPlayer'
import { buildEndingSequence } from '@/domain/ending-recap'
import { galleryEntryLabel } from '@/domain/gallery-labels'
import type { ProgressData } from '@/domain/progress'
import type { AssetCatalog } from '@/domain/runtime-assets'
import type { GalleryEntry } from '@/domain/types'

interface GalleryScreenProps {
  entries: GalleryEntry[]
  progress: ProgressData
  catalog: AssetCatalog
  onBack(): void
}

export function GalleryScreen({
  entries,
  progress,
  catalog,
  onBack,
}: GalleryScreenProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selectedEntry = entries.find((entry) => entry.id === selectedId)
  const selectedUnlocked = selectedEntry
    && progress.galleryUnlocks.includes(selectedEntry.id)

  const selectedSequence = selectedEntry && selectedUnlocked
    ? buildEndingSequence({
        roomId: selectedEntry.roomId,
        endingId: selectedEntry.endingId,
        recap: progress.endingRecaps[selectedEntry.roomId]?.[
          selectedEntry.endingId
        ],
        adultEnabled: progress.settings.adultContent,
        adultReady: catalog.adult !== null,
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
          const unlocked = progress.galleryUnlocks.includes(entry.id)
          const label = galleryEntryLabel(
            entry.roomId,
            entry.endingId,
          )

          return (
            <article
              className={[
                'gallery-entry',
                unlocked ? 'gallery-entry-unlocked' : '',
              ].filter(Boolean).join(' ')}
              key={entry.id}
            >
              <button
                type="button"
                disabled={!unlocked}
                aria-label={label}
                aria-pressed={selectedId === entry.id}
                onClick={() => setSelectedId(entry.id)}
              >
                {unlocked ? label : '尚未解鎖'}
              </button>
            </article>
          )
        })}
      </div>

      {selectedEntry && selectedUnlocked && selectedSequence && (
        <div
          className="gallery-replay"
          aria-label={`${galleryEntryLabel(
            selectedEntry.roomId,
            selectedEntry.endingId,
          )}回想`}
        >
          <CinematicPlayer
            key={selectedEntry.id}
            assetIds={selectedSequence.assetIds}
            catalog={catalog}
            title={galleryEntryLabel(
              selectedEntry.roomId,
              selectedEntry.endingId,
            )}
          />
        </div>
      )}
    </section>
  )
}
