import type { CSSProperties } from 'react'
import type { StatName } from '@/domain/types'

interface StatusStripProps {
  stats: Record<StatName, number>
  exact?: boolean
}

const statusItems: Array<{
  id: StatName
  label: string
}> = [
  { id: 'affection', label: '好感' },
  { id: 'trust', label: '信任' },
  { id: 'intimacy', label: '親密' },
]

export function StatusStrip({
  stats,
  exact = false,
}: StatusStripProps) {
  return (
    <aside
      className="status-strip"
      data-testid="status-strip"
      aria-label="角色狀態"
    >
      {statusItems.map(({ id, label }) => {
        const level = Math.max(8, Math.min(100, 38 + stats[id] * 12))

        return (
          <div className="status-item" key={id}>
            <span className="status-label">
              <span>{label}</span>
              {exact && (
                <output data-testid={`exact-stat-${id}`}>
                  {stats[id]}
                </output>
              )}
            </span>
            <span className="status-track" aria-hidden="true">
              <span
                className="status-level"
                style={{ '--status-level': `${level}%` } as CSSProperties}
              />
            </span>
          </div>
        )
      })}
    </aside>
  )
}
