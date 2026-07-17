import { expect, test } from '@playwright/test'
import { endingRoutes } from './ending-routes'
import { playRoute } from './helpers'

for (const route of endingRoutes) {
  test(
    `adult-off ${route.roomLabel} ${route.endingId} reaches the correct ending without adult assets`,
    async ({ page }) => {
      const adultRequests: string[] = []
      page.on('request', (request) => {
        if (request.url().includes('/adult/')) {
          adultRequests.push(request.url())
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

      expect(adultRequests).toEqual([])

      if (route.safeResultAssetId) {
        await expect(page.getByTestId('result-art'))
          .toHaveAttribute(
            'data-asset-id',
            route.safeResultAssetId,
          )
      }
    },
  )
}
