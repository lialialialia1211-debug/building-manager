import { expect, test } from '@playwright/test'
import { endingRoutes, roomARoutes } from './ending-routes'
import {
  playRoute,
  recordPageFailures,
  waitForRenderedImages,
} from './helpers'

function isAdultRequest(url: string): boolean {
  return url.includes('adult-asset-manifest.json')
    || url.includes('/assets/adult/')
}

test('fresh profile defaults adult content off without adult requests', async ({
  page,
}) => {
  const adultRequests: string[] = []
  const failures = recordPageFailures(page)
  page.on('request', (request) => {
    if (isAdultRequest(request.url())) adultRequests.push(request.url())
  })

  await page.goto('/')
  await page.getByRole('button', { name: '設定' }).click()
  await expect(page.getByRole('checkbox', { name: '成人內容' }))
    .not.toBeChecked()
  expect(adultRequests).toEqual([])
  await failures.assertNoFailures()
})

for (const route of endingRoutes) {
  test(
    `adult-off ${route.roomLabel} ${route.endingId} reaches the correct ending without adult assets`,
    async ({ page }) => {
      const adultRequests: string[] = []
      page.on('request', (request) => {
        if (isAdultRequest(request.url())) {
          adultRequests.push(request.url())
        }
      })

      const failures = await playRoute(
        page,
        route.roomName,
        [...route.panels],
        {
          adultContent: false,
          dealSeed: route.dealSeed,
        },
      )

      await expect(
        page.getByRole('heading', {
          level: 1,
          name: route.heading,
        }),
      ).toBeVisible()

      if (route.safeResultAssetId) {
        const prefix = route.roomId === 'room_a_blackout' ? 'a' : 'b'
        const player = page.locator('.cinematic-player')
        await player.getByRole('button', { name: '重播' }).click()
        await player.getByRole('button', { name: '暫停' }).click()

        for (let frame = 1; frame <= 6; frame += 1) {
          await expect(page.getByTestId('cinematic-stage'))
            .toHaveAttribute(
              'data-asset-id',
              `${prefix}_safe_0${frame}`,
            )
          await waitForRenderedImages(page)
          if (frame < 6) {
            await player.getByRole('button', { name: '下一格' }).click()
          }
        }

        await expect(page.locator('.ending-story'))
          .toContainText(/關閉時.*替代/)
      }

      expect(
        adultRequests,
        `${route.roomLabel} ${route.endingId} requested adult assets`,
      ).toEqual([])
      await failures.assertNoFailures()
    },
  )
}

const adultIntimacyRoute = roomARoutes.find(
  (route) => route.endingId === 'intimacy',
)!

test('adult-on Room A intimacy loads adult assets and completes the player', async ({
  page,
}) => {
  const requests: string[] = []
  page.on('request', (request) => {
    requests.push(request.url())
  })

  const failures = await playRoute(
    page,
    adultIntimacyRoute.roomName,
    [...adultIntimacyRoute.panels],
    {
      adultContent: true,
      dealSeed: adultIntimacyRoute.dealSeed,
    },
  )

  const player = page.locator('.cinematic-player')
  const stage = page.getByTestId('cinematic-stage')
  await player.getByRole('button', { name: '重播' }).click()
  await player.getByRole('button', { name: '暫停' }).click()

  for (let frame = 1; frame <= 6; frame += 1) {
    const assetId = `a_intimacy_0${frame}`
    await expect(stage).toHaveAttribute('data-asset-id', assetId)
    await waitForRenderedImages(page)
    expect(requests.some((url) => url.includes(
      `/assets/adult/${assetId}_master.webp`,
    ))).toBe(true)
    if (frame < 6) {
      await player.getByRole('button', { name: '下一格' }).click()
    }
  }

  expect(requests.some((url) => (
    url.includes('adult-asset-manifest.json')
  ))).toBe(true)
  await failures.assertNoFailures()
})
