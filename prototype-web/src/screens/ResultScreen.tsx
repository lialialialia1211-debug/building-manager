import type { SettledResult } from '@/app/store'
import { StatusStrip } from '@/components/StatusStrip'
import { resolveAsset } from '@/domain/asset-resolver'
import { clueLabel } from '@/domain/clue-labels'
import { galleryUnlockLabel } from '@/domain/gallery-labels'
import { greyboxAnchor } from '@/domain/greybox-assets'
import type { ProgressData } from '@/domain/progress'
import type {
  RoomDefinition,
  StatName,
} from '@/domain/types'

interface ResultScreenProps {
  room: RoomDefinition
  result: SettledResult
  stats: Record<StatName, number>
  progress: ProgressData
  onReplay(): void
  onReturn(): void
}

function resultAssetId(
  room: RoomDefinition,
  result: SettledResult,
  adultContent: boolean,
): string {
  if (result.endingId !== 'intimacy') {
    return room.endingContent[result.endingId].asset
  }

  const prefix = room.id === 'room_a_blackout'
    ? 'a'
    : room.id === 'room_b_wall'
      ? 'b'
      : null
  if (!prefix) {
    return resolveAsset({
      default: room.endingContent[result.endingId].asset,
    }, adultContent)
  }

  return resolveAsset({
    adult: `${prefix}_intimacy_06`,
    safe: `${prefix}_safe_06`,
  }, adultContent)
}

export function ResultScreen({
  room,
  result,
  stats,
  progress,
  onReplay,
  onReturn,
}: ResultScreenProps) {
  const endingContent = room.endingContent[result.endingId]
  const assetId = resultAssetId(
    room,
    result,
    progress.settings.adultContent,
  )

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
        data-asset-id={assetId}
      >
        <img
          src={greyboxAnchor('結局回想', true)}
          alt=""
          draggable={false}
        />
      </figure>

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
