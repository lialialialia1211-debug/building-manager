import { RuntimeImage } from '@/components/RuntimeImage'
import type { ProgressData } from '@/domain/progress'
import type { AssetCatalog } from '@/domain/runtime-assets'
import { backgroundUrl } from '@/domain/runtime-assets'
import { shouldShowSixthRoom } from '@/domain/unlocks'

interface BuildingScreenProps {
  progress?: ProgressData
  catalog?: AssetCatalog
  onOpenRoom(roomId: string): void
  onOpenGallery(): void
  onOpenSettings(): void
}

const openRooms = [
  { id: 'room_a_blackout', title: '停電之夜', background: 'bg_room_a' },
  { id: 'room_b_wall', title: '牆後的聲音', background: 'bg_room_b' },
] as const

const futureRooms = [1, 2, 3, 4] as const
const sixthRoomAssets = ['sixth_01', 'sixth_02', 'sixth_03'] as const

function hasBackground(
  catalog: AssetCatalog | undefined,
  backgroundId: string,
): catalog is AssetCatalog {
  if (!catalog) return false
  try {
    backgroundUrl(catalog, backgroundId)
    return true
  } catch {
    return false
  }
}

export function BuildingScreen({
  progress,
  catalog,
  onOpenRoom,
  onOpenGallery,
  onOpenSettings,
}: BuildingScreenProps) {
  const showSixthRoom = progress
    ? shouldShowSixthRoom(progress)
    : false

  return (
    <section
      className="building-screen"
      data-testid="building-screen"
      aria-labelledby="building-title"
    >
      <header className="building-header">
        <div>
          <p className="building-kicker">夜班管理室</p>
          <h1 id="building-title">大樓管理員</h1>
          <p className="building-placeholder-note">
            可玩測試版 · placeholder art（角色為暫用素材）
          </p>
        </div>
        <nav className="building-nav" aria-label="大樓功能">
          <button
            className="building-link"
            type="button"
            onClick={onOpenGallery}
          >
            圖鑑
          </button>
          <button
            className="building-link"
            type="button"
            onClick={onOpenSettings}
          >
            設定
          </button>
        </nav>
      </header>

      <div className="building-grid" aria-label="大樓房間">
        {openRooms.map((room) => {
          const completedCount = (
            progress?.completedEndings[room.id]?.length ?? 0
          )

          return (
            <button
              className="room-window room-window-open"
              type="button"
              key={room.id}
              onClick={() => onOpenRoom(room.id)}
            >
              {hasBackground(catalog, room.background) && (
                <img
                  className="room-window-art"
                  src={backgroundUrl(catalog, room.background)}
                  alt=""
                  draggable={false}
                />
              )}
              <span className="room-window-text">
                <span className="room-status">可進入</span>
                <strong>{room.title}</strong>
                <span>{completedCount} / 3 結局</span>
              </span>
            </button>
          )
        })}

        {futureRooms.map((roomNumber) => (
          <div
            className="room-window room-window-locked"
            key={roomNumber}
            aria-label="未開放房間"
          >
            <span
              className="locked-silhouette"
              aria-hidden="true"
            />
            <span>未開放</span>
          </div>
        ))}

        {showSixthRoom && (
          <div
            className="sixth-room-tease"
            aria-label="不存在的第六房間"
          >
            {catalog && (
              <div className="sixth-room-frames">
                {sixthRoomAssets.map((assetId) => (
                  <RuntimeImage
                    key={assetId}
                    catalog={catalog}
                    assetId={assetId}
                    variant="preview"
                    alt="第六房間預告"
                    className="sixth-room-frame"
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
