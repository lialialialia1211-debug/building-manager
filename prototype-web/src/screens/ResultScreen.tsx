import type { SettledResult } from '@/app/store'
import { CinematicPlayer } from '@/components/CinematicPlayer'
import { StatusStrip } from '@/components/StatusStrip'
import { clueLabel } from '@/domain/clue-labels'
import { buildEndingRecap } from '@/domain/ending-recap'
import { galleryUnlockLabel } from '@/domain/gallery-labels'
import type { ProgressData } from '@/domain/progress'
import type { AssetCatalog } from '@/domain/runtime-assets'
import type {
  GalleryEntry,
  RoomDefinition,
  StatName,
} from '@/domain/types'

interface ResultScreenProps {
  room: RoomDefinition
  result: SettledResult
  stats: Record<StatName, number>
  progress: ProgressData
  catalog: AssetCatalog
  adultStatus: 'disabled' | 'loading' | 'ready' | 'error'
  galleryEntry?: GalleryEntry
  galleryStatus: 'loading' | 'ready' | 'error'
  onReplay(): void
  onReturn(): void
}

export function ResultScreen({
  room,
  result,
  stats,
  progress,
  catalog,
  adultStatus,
  galleryEntry,
  galleryStatus,
  onReplay,
  onReturn,
}: ResultScreenProps) {
  const endingContent = room.endingContent[result.endingId]
  const recap = buildEndingRecap({
    room,
    endingId: result.endingId,
    savedRecap: progress.endingRecaps[room.id]?.[result.endingId],
    adultContent: progress.settings.adultContent,
    adultCatalogReady: adultStatus === 'ready' && catalog.adult !== null,
    galleryEntry,
    catalog,
  })
  const fallbackMessage = result.endingId !== 'intimacy'
    ? null
    : galleryStatus === 'loading'
      ? '回想資料載入中，暫時播放安全開場。'
      : galleryStatus === 'error'
        ? '回想資料載入失敗，已改用安全開場。'
        : recap.usedSafeFallback && progress.settings.adultContent
          ? adultStatus === 'ready'
            ? '成人回想資料無法使用，已改用安全版。'
            : '成人美術暫時無法載入，此回想已改用安全版。'
          : null

  return (
    <section
      className="result-screen"
      data-testid="result-screen"
      aria-labelledby="ending-title"
    >
      <p className="result-kicker">結局完成</p>
      <h1 id="ending-title">{endingContent.title}</h1>

      <div
        className="result-art"
        data-testid="result-art"
      >
        <CinematicPlayer
          assetIds={recap.assetIds}
          catalog={catalog}
          title={`${endingContent.title}回想`}
        />
      </div>

      {fallbackMessage && (
          <p className="ending-safe-fallback" role="status">
            {fallbackMessage}
          </p>
      )}

      {endingContent.dialogue && (
        <section
          className="ending-story"
          aria-labelledby="ending-story-title"
        >
          <h2 id="ending-story-title">結局故事</h2>
          {endingContent.dialogue.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </section>
      )}

      <StatusStrip
        stats={stats}
        exact={progress.settings.exactStats}
      />

      <div className="result-rewards">
        <section aria-labelledby="new-clues-title">
          <h2 id="new-clues-title">新線索</h2>
          {result.newClues.length > 0
            ? (
                <ul>
                  {result.newClues.map((clueId) => (
                    <li key={clueId}>{clueLabel(clueId)}</li>
                  ))}
                </ul>
              )
            : <p>本次沒有新增線索。</p>}
        </section>

        <section aria-labelledby="new-gallery-title">
          <h2 id="new-gallery-title">新圖鑑</h2>
          {result.newGalleryUnlocks.length > 0
            ? (
                <ul>
                  {result.newGalleryUnlocks.map((unlockId) => (
                    <li key={unlockId}>
                      {galleryUnlockLabel(unlockId)}
                    </li>
                  ))}
                </ul>
              )
            : <p>本次沒有新增圖鑑。</p>}
        </section>
      </div>

      <div className="result-actions">
        <button type="button" onClick={onReplay}>
          重新遊玩
        </button>
        <button type="button" onClick={onReturn}>
          返回大樓
        </button>
      </div>
    </section>
  )
}
