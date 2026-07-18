import { expect, test } from '@playwright/test'
import { recordPageFailures } from './helpers'

test('shows three non-interactive sixth-room teasers without blocking open rooms', async ({
  page,
}) => {
  const failures = recordPageFailures(page)
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
          adultContent: false,
          exactStats: false,
          autoFastForward: true,
        },
      }),
    )
  })

  await page.goto('/')

  const teaser = page.getByLabel('不存在的第六房間')
  await expect(teaser).toBeVisible()
  await expect(teaser.getByRole('img', {
    name: /不存在的第六房間異象/,
  })).toHaveCount(3)
  for (const image of await teaser.getByRole('img').all()) {
    await expect(image).toBeVisible()
  }
  await expect(teaser.getByRole('button')).toHaveCount(0)
  await expect(teaser.getByRole('link')).toHaveCount(0)
  await teaser.click()
  await expect(page.getByTestId('building-screen')).toBeVisible()

  const roomA = page.getByRole('button', { name: '進入停電之夜' })
  const roomB = page.getByRole('button', { name: '進入牆後的聲音' })
  await expect(roomA).toBeEnabled()
  await expect(roomB).toBeEnabled()
  await roomA.click()
  await expect(page.getByRole('heading', { name: '停電之夜' }))
    .toBeVisible()
  await page.getByRole('button', { name: '返回大樓' }).click()
  await page.getByRole('button', { name: '進入牆後的聲音' }).click()
  await expect(page.getByRole('heading', { name: '牆後的聲音' }))
    .toBeVisible()
  await failures.assertNoFailures()
})
