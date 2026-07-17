import type { EndingId } from './types'

const roomLabels: Record<string, string> = {
  room_a_blackout: '停電之夜',
  room_b_wall: '牆後的聲音',
}

const endingLabels: Record<EndingId, string> = {
  main: '主線結局',
  normal: '普通結局',
  intimacy: '親密結局',
}

export function galleryEntryLabel(
  roomId: string,
  endingId: EndingId,
): string {
  return `${roomLabels[roomId] ?? '未知房間'}：${endingLabels[endingId]}`
}

export function galleryUnlockLabel(unlockId: string): string {
  const endingId = (
    ['main', 'normal', 'intimacy'] as const
  ).find((candidate) => unlockId.endsWith(`_${candidate}`))
  const roomId = unlockId.startsWith('room_a_')
    ? 'room_a_blackout'
    : unlockId.startsWith('room_b_')
      ? 'room_b_wall'
      : null

  return roomId && endingId
    ? galleryEntryLabel(roomId, endingId)
    : '新圖鑑項目'
}
