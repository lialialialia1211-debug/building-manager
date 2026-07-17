import type { ProgressData } from './progress'

export function shouldShowSixthRoom(
  progress: ProgressData,
): boolean {
  return (
    progress.completedEndings.room_a_blackout
      ?.includes('main') === true
    && progress.completedEndings.room_b_wall
      ?.includes('main') === true
  )
}
