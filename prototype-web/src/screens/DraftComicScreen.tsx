import type { DragEvent } from 'react'
import { useAppStore } from '@/app/store'
import { ComicPanel } from '@/components/ComicPanel'
import { CandidateCard } from '@/components/CandidateCard'
import { StatusStrip } from '@/components/StatusStrip'
import type {
  DraftStoryEngine,
} from '@/domain/draft-story-engine'
import type { AssetCatalog } from '@/domain/runtime-assets'
import { wasRead } from '@/domain/read-history'
import { revealDuration } from '@/domain/read-speed'
import { resolveRoomPresentation } from '@/domain/room-presentation'
import { clueLabel } from '@/domain/clue-labels'
import type { PanelDefinition, StatName } from '@/domain/types'

interface DraftComicScreenProps {
  roomId: string
  engine: DraftStoryEngine
  catalog: AssetCatalog
}

type DragPayload =
  | { source: 'tray'; panelId: string }
  | { source: 'slot'; slotIndex: number }

const dragMime = 'application/x-building-manager-card'
const slotIndexes = [0, 1, 2, 3, 4, 5] as const
const statLabels: Record<StatName, string> = {
  affection: '好感',
  trust: '信任',
  intimacy: '親密傾向',
}

function setDragPayload(
  event: DragEvent<HTMLElement>,
  payload: DragPayload,
): void {
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData(dragMime, JSON.stringify(payload))
}

function getDragPayload(
  event: DragEvent<HTMLElement>,
): DragPayload | null {
  try {
    const value = JSON.parse(event.dataTransfer.getData(dragMime))
    if (
      value?.source === 'tray'
      && typeof value.panelId === 'string'
    ) {
      return value
    }
    if (
      value?.source === 'slot'
      && Number.isInteger(value.slotIndex)
    ) {
      return value
    }
  } catch {
    return null
  }
  return null
}

function dialogueFor(
  panel: PanelDefinition,
  variant: string,
): string[] {
  return panel.dialogueVariants?.[variant] ?? panel.dialogue
}

function effectText(
  stat: StatName,
  delta: number,
  exact: boolean,
): string {
  const direction = delta > 0 ? '上升' : '下降'
  const exactDelta = delta > 0 ? `+${delta}` : String(delta)
  return exact
    ? `${statLabels[stat]}${direction}（${exactDelta}）`
    : `${statLabels[stat]}${direction}`
}

export function DraftComicScreen({
  roomId,
  engine,
  catalog,
}: DraftComicScreenProps) {
  const progress = useAppStore((state) => state.progress)
  const choiceLocked = useAppStore((state) => state.choiceLocked)
  const revealedPanelId = useAppStore(
    (state) => state.revealedPanelId,
  )
  const placePanel = useAppStore((state) => state.placePanel)
  const movePanel = useAppStore((state) => state.movePanel)
  const removePanel = useAppStore((state) => state.removePanel)
  const confirmArrangement = useAppStore(
    (state) => state.confirmArrangement,
  )
  const finishReveal = useAppStore((state) => state.finishReveal)

  if (engine.room.id !== roomId) {
    return (
      <section
        className="comic-screen comic-screen-loading"
        data-testid="comic-screen"
        role="status"
      >
        正在準備漫畫頁
      </section>
    )
  }

  const {
    slots,
    stats,
    confirmed,
    revealCount,
  } = engine.snapshot
  const candidates = engine.getCandidates()
  const selected = new Set(slots.filter(Boolean))
  const filledCount = selected.size
  const presentation = resolveRoomPresentation(
    engine.room.id,
    progress.crossRoomFlags,
  )
  const revealedPanel = revealedPanelId
    ? engine.room.panels[revealedPanelId]
    : undefined
  const dialogueVariant = presentation.dialogueVariantFor(
    revealedPanelId ?? undefined,
    revealedPanel?.dialogueVariant,
  )
  const durationMs = revealedPanelId && revealedPanel
    ? revealDuration({
        wasRead: wasRead(
          progress.readHistory,
          revealedPanelId,
          dialogueVariant,
        ),
        motion: revealedPanel.motion ?? 'standard',
        autoFastForward: progress.settings.autoFastForward,
      })
    : undefined
  const revealDialogue = revealedPanel
    ? dialogueFor(revealedPanel, dialogueVariant)
    : []
  const revealEffects = revealedPanel
    ? Object.entries(revealedPanel.effects ?? {}).filter(
        (entry): entry is [StatName, number] => entry[1] !== 0,
      )
    : []
  const revealEvents = revealedPanel?.setFlags ?? []
  const revealStep = Math.min(6, revealCount + 1)

  return (
    <section
      className="comic-screen comic-screen-drafting"
      data-testid="comic-screen"
      data-room-visual-variant={presentation.visualVariant}
      data-phase={confirmed ? 'revealing' : 'arranging'}
      aria-labelledby="comic-room-title"
    >
      <header className="comic-header">
        <div>
          <p className="comic-kicker">十二選六・漫畫編排</p>
          <h1 id="comic-room-title">{engine.room.title}</h1>
        </div>
        <p className="comic-progress">
          {confirmed
            ? `揭曉 ${revealStep} / 6`
            : `已編排 ${filledCount} / 6`}
        </p>
      </header>

      <section
        className="story-opening-copy"
        aria-labelledby="story-opening-title"
      >
        <h2 id="story-opening-title">事件開場</h2>
        {engine.room.openingDialogue?.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </section>

      <div className="comic-workspace">
        <div className="comic-page" aria-label="可編排漫畫頁">
          <ComicPanel
            testId="comic-opening"
            assetId={engine.room.openingAssets[0]}
            catalog={catalog}
            label="固定開場"
          />

          <div className="comic-choice-grid">
            {slotIndexes.map((slotIndex) => {
              const panelId = slots[slotIndex]
              return (
                <div
                  className={[
                    'draft-slot',
                    panelId ? 'draft-slot-filled' : '',
                    panelId === revealedPanelId
                      ? 'draft-slot-revealing'
                      : '',
                  ].filter(Boolean).join(' ')}
                  key={slotIndex}
                  data-slot-index={slotIndex}
                  draggable={Boolean(panelId) && !choiceLocked}
                  onDragStart={(event) => {
                    setDragPayload(event, {
                      source: 'slot',
                      slotIndex,
                    })
                  }}
                  onDragOver={(event) => {
                    if (choiceLocked) return
                    event.preventDefault()
                    event.dataTransfer.dropEffect = 'move'
                  }}
                  onDrop={(event) => {
                    if (choiceLocked) return
                    event.preventDefault()
                    const payload = getDragPayload(event)
                    if (!payload) return
                    if (payload.source === 'tray') {
                      placePanel(payload.panelId, slotIndex)
                    } else {
                      movePanel(payload.slotIndex, slotIndex)
                    }
                  }}
                >
                  <ComicPanel
                    testId="comic-choice-slot"
                    assetId={
                      panelId
                        ? (
                            engine.room.panels[panelId]?.fullAsset
                            ?? engine.room.panels[panelId]?.previewAsset
                          )
                        : undefined
                    }
                    catalog={catalog}
                    label={
                      panelId
                        ? `已編排行動：${engine.room.panels[panelId]?.actionLabel ?? panelId}，第 ${slotIndex + 1} 格`
                        : `空白分鏡 ${slotIndex + 1}`
                    }
                    focused={
                      !confirmed
                      && slotIndex === slots.indexOf(null)
                    }
                    revealed={panelId === revealedPanelId}
                    revealDurationMs={
                      panelId === revealedPanelId
                        ? durationMs
                        : undefined
                    }
                    onRevealFinished={
                      panelId === revealedPanelId
                        ? () => finishReveal(dialogueVariant)
                        : undefined
                    }
                  />
                  {panelId && !choiceLocked && (
                    <div className="draft-slot-actions">
                      <button
                        type="button"
                        onClick={() => removePanel(slotIndex)}
                        aria-label={`移除第 ${slotIndex + 1} 格`}
                      >
                        移除
                      </button>
                      <button
                        type="button"
                        disabled={slotIndex === 0}
                        onClick={() => movePanel(
                          slotIndex,
                          slotIndex - 1,
                        )}
                        aria-label={`第 ${slotIndex + 1} 格向左移`}
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        disabled={slotIndex === 5}
                        onClick={() => movePanel(
                          slotIndex,
                          slotIndex + 1,
                        )}
                        aria-label={`第 ${slotIndex + 1} 格向右移`}
                      >
                        →
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <ComicPanel
            testId="comic-ending"
            assetId={engine.room.endingContent.normal.asset}
            catalog={catalog}
            label="三結局收束錨點"
          />
        </div>

        <StatusStrip
          stats={stats}
          exact={progress.settings.exactStats}
        />
      </div>

      {revealedPanel && (
        <section
          className="panel-reveal"
          role="status"
          aria-label="分鏡揭曉"
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="panel-reveal-dialogue">
            {revealDialogue.map((line, index) => (
              <p key={`${dialogueVariant}-${index}`}>{line}</p>
            ))}
          </div>
          {(revealEffects.length > 0 || revealEvents.length > 0) && (
            <ul className="panel-reveal-consequences">
              {revealEffects.map(([stat, delta]) => (
                <li key={stat}>
                  {effectText(
                    stat,
                    delta,
                    progress.settings.exactStats,
                  )}
                </li>
              ))}
              {revealEvents.map((flag) => (
                <li key={flag}>事件更新：{clueLabel(flag)}</li>
              ))}
            </ul>
          )}
        </section>
      )}

      {!confirmed && (
        <section
          className="candidate-tray draft-candidate-tray"
          aria-labelledby="candidate-tray-title"
          onDragOver={(event) => {
            event.preventDefault()
            event.dataTransfer.dropEffect = 'move'
          }}
          onDrop={(event) => {
            event.preventDefault()
            const payload = getDragPayload(event)
            if (payload?.source === 'slot') {
              removePanel(payload.slotIndex)
            }
          }}
        >
          <div className="candidate-tray-heading">
            <div>
              <h2 id="candidate-tray-title">本次隨機劇情卡</h2>
              <p>
                從 12 張挑 6 張拖進上方；確認前可換位或移除。
              </p>
            </div>
            <button
              className="confirm-arrangement"
              type="button"
              disabled={filledCount !== 6}
              onClick={confirmArrangement}
            >
              確認編排並揭曉
            </button>
          </div>
          <div className="candidate-grid draft-candidate-grid">
            {candidates.map((candidate) => {
              const isSelected = selected.has(candidate.id)
              const disabled = (
                choiceLocked
                || isSelected
                || filledCount >= 6
              )
              return (
                <CandidateCard
                  key={candidate.id}
                  panelId={candidate.id}
                  actionLabel={candidate.actionLabel}
                  selectionLabel={`加入編排：${candidate.actionLabel}`}
                  catalog={catalog}
                  variant="preview"
                  disabled={disabled}
                  selected={isSelected}
                  draggable={!disabled}
                  onChoose={placePanel}
                  onDragStart={(event) => {
                    setDragPayload(event, {
                      source: 'tray',
                      panelId: candidate.id,
                    })
                  }}
                />
              )
            })}
          </div>
          <p className="draft-lock-note">
            六格確認後會整批鎖定，依排列順序揭曉，最後只收束到三種既定結局之一。
          </p>
        </section>
      )}

      {confirmed && (
        <p className="draft-locked-banner" role="status">
          編排已鎖定，正在依序揭曉第 {revealStep} 格。
        </p>
      )}
    </section>
  )
}
