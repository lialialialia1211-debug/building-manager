import type { EndingId, EndingRule, StatName } from './types'

export function resolveEnding(
  rules: EndingRule[],
  stats: Record<StatName, number>,
  flags: Record<string, boolean>,
): EndingId {
  const ordered = [...rules].sort(
    (first, second) => second.priority - first.priority,
  )
  const matchedRule = ordered.find((rule) => {
    const { conditions } = rule
    if (conditions.allFlags?.some((flag) => !flags[flag])) {
      return false
    }
    if (conditions.noneFlags?.some((flag) => flags[flag])) {
      return false
    }

    return !Object.entries(conditions.minimumStats ?? {}).some(
      ([name, minimum]) => stats[name as StatName] < minimum,
    )
  })

  return matchedRule?.id ?? 'normal'
}
