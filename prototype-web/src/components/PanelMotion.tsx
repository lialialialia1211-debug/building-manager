import { useRef, type CSSProperties } from 'react'

export interface PanelLayers {
  background: string
  characterA?: string
  characterB?: string
  effects?: string
}

interface PanelMotionProps {
  layers: PanelLayers
  durationMs: number
  onFinished(): void
}

export function PanelMotion({
  layers,
  durationMs,
  onFinished,
}: PanelMotionProps) {
  const didFinish = useRef(false)

  return (
    <div
      className="panel-motion"
      data-testid="panel-motion"
      style={{
        '--reveal-duration': `${durationMs}ms`,
      } as CSSProperties}
      onAnimationEnd={(event) => {
        if (
          event.target !== event.currentTarget
          || event.animationName !== 'panel-settle'
          || didFinish.current
        ) {
          return
        }

        didFinish.current = true
        onFinished()
      }}
    >
      <img
        className="layer layer-bg"
        src={layers.background}
        alt=""
        role="presentation"
        draggable={false}
      />
      {layers.characterA && (
        <img
          className="layer layer-a"
          src={layers.characterA}
          alt=""
          role="presentation"
          draggable={false}
        />
      )}
      {layers.characterB && (
        <img
          className="layer layer-b"
          src={layers.characterB}
          alt=""
          role="presentation"
          draggable={false}
        />
      )}
      {layers.effects && (
        <img
          className="layer layer-fx"
          src={layers.effects}
          alt=""
          role="presentation"
          draggable={false}
        />
      )}
    </div>
  )
}
