import { expect, test } from '@playwright/test'

test('shows sixth room only after both main endings', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'building-manager-progress-v1',
      JSON.stringify({
        version: 1,
        currentRun: null,
        completedEndings: {
          room_a_blackout: ['main'],
          room_b_wall: ['main'],
        },
        clues: [],
        galleryUnlocks: [],
        crossRoomFlags: { a_hidden_circuit: true },
        readHistory: {},
        settings: {
          adultContent: true,
          exactStats: false,
          autoFastForward: true,
        },
      }),
    )
  })

  await page.goto('/')

  await expect(
    page.getByLabel('不存在的第六房間'),
  ).toBeVisible()
})
