import { resolveAsset } from '@/domain/asset-resolver'
import { galleryEntryLabel } from '@/domain/gallery-labels'
import { greyboxPanel } from '@/domain/greybox-assets'
import type { ProgressData } from '@/domain/progress'
import type { GalleryEntry } from '@/domain/types'

interface GalleryScreenProps {
  entries: GalleryEntry[]
  progress: ProgressData
  onBack(): void
}

function replaySequence(
  entry: GalleryEntry,
  adultContent: boolean,
): string[] {
  if (!entry.adult) return [entry.id]

  if (!adultContent) {
    return (entry.safeSequence ?? [])
      .map((safe) => resolveAsset({ safe }, false))
      .filter(Boolean)
  }

  return (entry.adultSequence ?? entry.safeSequence ?? [])
    .map((adult, index) => resolveAsset({
      adult,
      safe: entry.safeSequence?.[index],
    }, true))
    .filter(Boolean)
}

export function GalleryScreen({
  entries,
  progress,
  onBack,
}: GalleryScreenProps) {
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
          const sequence = unlocked
            ? replaySequence(
                entry,
                progress.settings.adultContent,
              )
            : []
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
              >
                {unlocked ? label : '尚未解鎖'}
              </button>

              {unlocked && (
                <div
                  className="gallery-replay"
                  aria-label={`${label}回想`}
                >
                  {sequence.map((assetId, index) => (
                    <img
                      key={`${assetId}-${index}`}
                      src={greyboxPanel(assetId, index)}
                      alt=""
                      draggable={false}
                      data-asset-id={assetId}
                    />
                  ))}
                </div>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}
