import { PanelMotion } from './PanelMotion'

interface ComicPanelProps {
  testId: 'comic-opening' | 'comic-choice-slot' | 'comic-ending'
  label: string
  imageSrc?: string
  focused?: boolean
  revealed?: boolean
  revealDurationMs?: number
  onRevealFinished?(): void
}

export function ComicPanel({
  testId,
  label,
  imageSrc,
  focused = false,
  revealed = false,
  revealDurationMs,
  onRevealFinished,
}: ComicPanelProps) {
  const modifierClass = {
    'comic-opening': 'comic-panel-opening',
    'comic-choice-slot': 'comic-panel-choice-slot',
    'comic-ending': 'comic-panel-ending',
  }[testId]

  return (
    <article
      className={[
        'comic-panel',
        modifierClass,
        focused ? 'comic-panel-focused' : '',
        revealed ? 'comic-panel-revealed' : '',
        imageSrc ? 'comic-panel-filled' : 'comic-panel-empty',
      ].filter(Boolean).join(' ')}
      data-testid={testId}
      aria-label={label}
    >
      {imageSrc
        ? (
            revealed
            && revealDurationMs !== undefined
            && onRevealFinished
          )
          ? (
              <PanelMotion
                key={imageSrc}
                layers={{ background: imageSrc }}
                durationMs={revealDurationMs}
                onFinished={onRevealFinished}
              />
            )
          : <img src={imageSrc} alt="" draggable={false} />
        : <span className="empty-panel-mark" aria-hidden="true" />}
    </article>
  )
}
