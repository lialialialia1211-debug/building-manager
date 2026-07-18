import { RuntimeImage } from '@/components/RuntimeImage'
import { clueLabel } from '@/domain/clue-labels'
import type { ProgressData } from '@/domain/progress'
import type { AssetCatalog } from '@/domain/runtime-assets'
import type {
  CharacterDefinition,
  EndingId,
  RoomDefinition,
} from '@/domain/types'

interface RoomBriefScreenProps {
  room: RoomDefinition
  catalog: AssetCatalog
  characters: CharacterDefinition[]
  progress: ProgressData
  onStart(): void
  onBack(): void
}

const roomSynopses: Record<string, string> = {
  room_a_blackout:
    '停電後，住戶面臨突然到訪的訪客、異常配電箱與神祕留言。',
  room_b_wall:
    '住戶每晚聽見牆後傳來聲音，並與另一名住戶一同追查聲音來源。',
}

const endingIds: EndingId[] = [
  'main',
  'normal',
  'intimacy',
]

export function RoomBriefScreen({
  room,
  catalog,
  characters,
  progress,
  onStart,
  onBack,
}: RoomBriefScreenProps) {
  const roomCharacters = characters.filter(
    (character) => character.roomId === room.id,
  )
  const roomClueIds = new Set(
    endingIds.flatMap(
      (endingId) => room.endingContent[endingId].clueIds,
    ),
  )
  const foundClues = progress.clues.filter((clueId) =>
    roomClueIds.has(clueId),
  )
  const completedEndings = new Set(
    progress.completedEndings[room.id] ?? [],
  )
  const isReplay = completedEndings.size > 0

  return (
    <section
      className="room-brief-screen"
      data-testid="room-brief-screen"
      aria-labelledby="room-title"
    >
      <button
        className="brief-back"
        type="button"
        onClick={onBack}
      >
        返回大樓
      </button>

      <div className="brief-hero">
        <RuntimeImage
          assetId={room.backgroundAsset}
          variant="background"
          catalog={catalog}
          alt={`${room.title}房間背景`}
          className="brief-hero-art"
        />
        <header className="brief-header">
          <p>住戶事件</p>
          <h1 id="room-title">{room.title}</h1>
        </header>
      </div>

      <div className="brief-opening-preview" aria-label="開場預覽">
        {room.openingAssets.map((assetId, index) => (
          <RuntimeImage
            key={assetId}
            assetId={assetId}
            variant="preview"
            catalog={catalog}
            alt={`${room.title}開場預覽 ${index + 1}`}
          />
        ))}
      </div>

      <div className="brief-grid">
        <section aria-labelledby="resident-title">
          <h2 id="resident-title">成年角色</h2>
          <ul className="resident-list">
            {roomCharacters.map((character) => (
              <li key={character.id}>
                {character.displayName}，{character.age} 歲
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="synopsis-title">
          <h2 id="synopsis-title">事件簡介</h2>
          <p>
            {roomSynopses[room.id]
              ?? '管理室收到這個房間的異常事件漫畫頁。'}
          </p>
        </section>

        <section aria-labelledby="clue-title">
          <h2 id="clue-title">已發現線索</h2>
          {foundClues.length > 0 ? (
            <ul className="clue-list">
              {foundClues.map((clueId) => (
                <li key={clueId}>{clueLabel(clueId)}</li>
              ))}
            </ul>
          ) : (
            <p>尚未發現線索</p>
          )}
        </section>

        <section aria-labelledby="ending-title">
          <h2 id="ending-title">結局收集</h2>
          <ul className="ending-list">
            {endingIds.map((endingId) => (
              <li key={endingId}>
                未知結局
              </li>
            ))}
          </ul>
        </section>
      </div>

      <button
        className="brief-start"
        type="button"
        onClick={onStart}
      >
        {isReplay ? '重新遊玩' : '開始'}
      </button>
    </section>
  )
}
