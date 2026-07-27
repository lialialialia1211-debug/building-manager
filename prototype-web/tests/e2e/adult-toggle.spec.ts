import { expect, test } from '@playwright/test'
import { endingRoutes, roomARoutes } from './ending-routes'
import { playRoute } from './helpers'

for (const route of endingRoutes) {
  test(
    `adult-off ${route.roomLabel} ${route.endingId} reaches the correct ending without adult assets`,
    async ({ page }) => {
      const adultRequests: string[] = []
      page.on('request', (request) => {
        const url = request.url()
        if (
          url.includes('/adult/')
          || url.includes('adult-asset-manifest.json')
        ) {
          adultRequests.push(url)
        }
      })

      await playRoute(
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
      await expect(page.getByTestId('cinematic-player')).toBeVisible()

      expect(adultRequests).toEqual([])

      if (route.safeResultAssetId) {
        const firstFrame = page
          .locator('[data-testid="result-art"] [data-asset-id]')
          .first()
        await expect(firstFrame).toHaveAttribute(
          'data-asset-id',
          route.safeResultAssetId,
        )
      }
    },
  )
}

test(
  'adult-on intimacy loads the adult manifest and plays the recap',
  async ({ page }) => {
    const intimacyRoute = roomARoutes.find(
      (route) => route.endingId === 'intimacy',
    )!
    const adultManifestRequests: string[] = []
    page.on('request', (request) => {
      if (request.url().includes('adult-asset-manifest.json')) {
        adultManifestRequests.push(request.url())
      }
    })

    await playRoute(
      page,
      intimacyRoute.roomName,
      [...intimacyRoute.panels],
      {
        adultContent: true,
        dealSeed: intimacyRoute.dealSeed,
      },
    )

    await expect(
      page.getByRole('heading', {
        level: 1,
        name: intimacyRoute.heading,
      }),
    ).toBeVisible()
    await expect(page.getByTestId('cinematic-player')).toBeVisible()

    expect(adultManifestRequests.length).toBeGreaterThan(0)
    const firstFrame = page
      .locator('[data-testid="result-art"] [data-asset-id]')
      .first()
    await expect(firstFrame).toHaveAttribute(
      'data-asset-id',
      'a_intimacy_01',
    )
  },
)
