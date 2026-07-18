import type { SettledResult } from '@/app/store'
import { CinematicPlayer } from '@/components/CinematicPlayer'
import { StatusStrip } from '@/components/StatusStrip'
import { clueLabel } from '@/domain/clue-labels'
import { buildEndingSequence } from '@/domain/ending-recap'
import { galleryUnlockLabel } from '@/domain/gallery-labels'
import type { ProgressData } from '@/domain/progress'
import type { AssetCatalog } from '@/domain/runtime-assets'
import type {
  RoomDefinition,
  StatName,
} from '@/domain/types'
import type { AdultStatus } from '@/hooks/use-runtime-assets'

interface ResultScreenProps {
  room: RoomDefinition
  result: SettledResult
  stats: Record<StatName, number>
  progress: ProgressData
  catalog: AssetCatalog
  adultStatus?: AdultStatus
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
  onReplay,
  onReturn,
}: ResultScreenProps) {
  const endingContent = room.endingContent[result.endingId]
  const recap = progress.endingRecaps[room.id]?.[result.endingId]
  const sequence = buildEndingSequence({
    roomId: room.id,
    endingId: result.endingId,
    recap,
    adultEnabled: progress.settings.adultContent,
    adultReady: catalog.adult !== null,
  })

  return (
    <section
      className="result-screen"
      data-testid="result-screen"
      aria-labelledby="ending-title"
    >
      <p className="result-kicker">結局完成</p>
      <h1 id="ending-title">{endingContent.title}</h1>

      <figure
        className="result-art"
        data-testid="result-art"
        data-ending-asset={endingContent.asset}
      >
        <CinematicPlayer
          assetIds={sequence.assetIds}
          catalog={catalog}
          title={endingContent.title}
        />
      </figure>

      {sequence.usedSafeFallback && result.endingId === 'intimacy' && (
        <p className="result-safe-note" role="note">
          {adultStatus === 'error'
            ? '成人回想暫時無法載入，已改用安全版呈現。'
            : '目前以安全版呈現親密回想；開啟成人內容可觀看完整版本。'}
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
