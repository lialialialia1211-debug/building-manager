import { PanelMotion } from './PanelMotion'
import { RuntimeImage } from './RuntimeImage'
import { assetUrl, type AssetCatalog } from '@/domain/runtime-assets'

interface ComicPanelProps {
  testId: 'comic-opening' | 'comic-choice-slot' | 'comic-ending'
  label: string
  assetId?: string
  catalog: AssetCatalog
  focused?: boolean
  revealed?: boolean
  revealDurationMs?: number
  onRevealFinished?(): void
}

export function ComicPanel({
  testId,
  label,
  assetId,
  catalog,
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
  const fullImageUrl = assetId
    ? assetUrl(catalog, assetId, 'full')
    : ''

  return (
    <article
      className={[
        'comic-panel',
        modifierClass,
        focused ? 'comic-panel-focused' : '',
        revealed ? 'comic-panel-revealed' : '',
        assetId ? 'comic-panel-filled' : 'comic-panel-empty',
      ].filter(Boolean).join(' ')}
      data-testid={testId}
      aria-label={label}
    >
      {assetId
        ? (
            revealed
            && revealDurationMs !== undefined
            && onRevealFinished
          )
          ? (
              <PanelMotion
                key={assetId}
                layers={{ background: fullImageUrl }}
                durationMs={revealDurationMs}
                onFinished={onRevealFinished}
                background={
                  <RuntimeImage
                    assetId={assetId}
                    variant="full"
                    catalog={catalog}
                    alt={label}
                    className="layer layer-bg"
                  />
                }
              />
            )
          : (
              <RuntimeImage
                assetId={assetId}
                variant="full"
                catalog={catalog}
                alt={label}
              />
            )
        : <span className="empty-panel-mark" aria-hidden="true" />}
    </article>
  )
}
