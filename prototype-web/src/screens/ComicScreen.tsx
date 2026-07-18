import { CandidateCard } from '@/components/CandidateCard'
import { ComicPanel } from '@/components/ComicPanel'
import { StatusStrip } from '@/components/StatusStrip'
import { useAppStore } from '@/app/store'
import { DraftStoryEngine } from '@/domain/draft-story-engine'
import type { AssetCatalog } from '@/domain/runtime-assets'
import { wasRead } from '@/domain/read-history'
import { revealDuration } from '@/domain/read-speed'
import { resolveRoomPresentation } from '@/domain/room-presentation'
import { clueLabel } from '@/domain/clue-labels'
import type {
  Candidate,
  StoryEngine,
} from '@/domain/story-engine'
import type {
  PanelDefinition,
  StatName,
} from '@/domain/types'
import { DraftComicScreen } from '@/screens/DraftComicScreen'
import '@/styles/comic.css'

interface ComicScreenProps {
  roomId: string
  catalog: AssetCatalog
}

const choiceSlots = [0, 1, 2, 3, 4, 5] as const
const statLabels: Record<StatName, string> = {
  affection: '好感',
  trust: '信任',
  intimacy: '親密傾向',
}

function dialogueFor(
  panel: PanelDefinition,
  variant: string,
): string[] {
  return panel.dialogueVariants?.[variant] ?? panel.dialogue ?? []
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

function candidatesFromNode(
  engine: StoryEngine,
  panelId: string,
): Candidate[] {
  const node = Object.values(engine.room.nodes).find(
    ({ candidates }) => candidates.includes(panelId),
  )
  if (!node) {
    throw new Error(`missing candidate node for ${panelId}`)
  }

  return node.candidates.map((candidateId) => {
    const panel = engine.room.panels[candidateId]
    if (!panel) {
      throw new Error(`missing story panel ${candidateId}`)
    }

    return { id: candidateId, ...panel }
  })
}

function visibleCandidates(
  engine: StoryEngine,
  revealedPanelId: string | null,
): Candidate[] {
  if (revealedPanelId) {
    return candidatesFromNode(engine, revealedPanelId)
  }

  if (engine.atEndingAnchor()) {
    const lastPanelId = engine.snapshot.chosenPanels.at(-1)
    return lastPanelId
      ? candidatesFromNode(engine, lastPanelId)
      : []
  }

  return engine.getCandidates()
}

export function ComicScreen({ roomId, catalog }: ComicScreenProps) {
  const engine = useAppStore((state) => state.engine)

  if (engine instanceof DraftStoryEngine) {
    return <DraftComicScreen
      roomId={roomId}
      engine={engine}
      catalog={catalog}
    />
  }

  return <LegacyComicScreen roomId={roomId} catalog={catalog} />
}

interface LegacyComicScreenProps {
  roomId: string
  catalog: AssetCatalog
}

function LegacyComicScreen({ roomId, catalog }: LegacyComicScreenProps) {
  const engine = useAppStore((state) => state.engine)
  const choiceLocked = useAppStore((state) => state.choiceLocked)
  const revealedPanelId = useAppStore(
    (state) => state.revealedPanelId,
  )
  const choosePanel = useAppStore((state) => state.choosePanel)
  const finishReveal = useAppStore((state) => state.finishReveal)
  const progress = useAppStore((state) => state.progress)

  if (
    !engine
    || engine instanceof DraftStoryEngine
    || engine.room.id !== roomId
  ) {
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

  const { choiceCount, chosenPanels, stats } = engine.snapshot
  const candidates = visibleCandidates(engine, revealedPanelId)
  const currentStep = Math.min(
    6,
    Math.max(1, choiceCount + (choiceLocked ? 0 : 1)),
  )
  const focusedSlot = Math.min(
    5,
    Math.max(0, choiceCount - (choiceLocked ? 1 : 0)),
  )
  const candidatesDisabled = choiceLocked || engine.atEndingAnchor()
  const revealedPanel = revealedPanelId
    ? engine.room.panels[revealedPanelId]
    : undefined
  const presentation = resolveRoomPresentation(
    engine.room.id,
    progress.crossRoomFlags,
  )
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

  return (
    <section
      className="comic-screen"
      data-testid="comic-screen"
      data-room-visual-variant={presentation.visualVariant}
      aria-labelledby="comic-room-title"
    >
      <header className="comic-header">
        <div>
          <p className="comic-kicker">事件漫畫頁</p>
          <h1 id="comic-room-title">{engine.room.title}</h1>
        </div>
        <p className="comic-progress" aria-label={`步驟 ${currentStep} / 6`}>
          步驟 {currentStep} / 6
        </p>
      </header>

      <div className="comic-workspace">
        <div className="comic-page" aria-label="漫畫頁">
          <ComicPanel
            testId="comic-opening"
            assetId={engine.room.openingAssets[0]}
            catalog={catalog}
            label="固定開場"
          />

          <div className="comic-choice-grid">
            {choiceSlots.map((slotIndex) => {
              const panelId = chosenPanels[slotIndex]

              return (
                <ComicPanel
                  key={slotIndex}
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
                      ? `已選行動：${engine.room.panels[panelId]?.actionLabel ?? panelId}，第 ${slotIndex + 1} 格`
                      : `空白分鏡 ${slotIndex + 1}`
                  }
                  focused={slotIndex === focusedSlot}
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
              )
            })}
          </div>

          <ComicPanel
            testId="comic-ending"
            assetId={engine.room.endingContent.normal.asset}
            catalog={catalog}
            label="固定結尾錨點"
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
                <li key={flag}>
                  事件更新：{clueLabel(flag)}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {!choiceLocked && choiceCount > 0 && (
        <span
          className="sr-only"
          data-testid="reveal-complete"
          data-step={choiceCount}
        >
          第 {choiceCount} 格揭示完成
        </span>
      )}

      <section
        className="candidate-tray"
        aria-labelledby="candidate-tray-title"
      >
        <div className="candidate-tray-heading">
          <h2 id="candidate-tray-title">選擇下一個行動</h2>
          <p>選定後將立即保存，無法撤回。</p>
        </div>
        <div className="candidate-grid">
          {candidates.map((candidate) => (
            <CandidateCard
              key={candidate.id}
              panelId={candidate.id}
              previewAsset={candidate.previewAsset}
              actionLabel={candidate.actionLabel}
              catalog={catalog}
              variant="preview"
              disabled={candidatesDisabled}
              onChoose={choosePanel}
            />
          ))}
        </div>
      </section>
    </section>
  )
}
