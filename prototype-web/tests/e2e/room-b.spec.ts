import { expect, test } from '@playwright/test'
import { roomBRoutes } from './ending-routes'
import { playRoute } from './helpers'

for (const route of roomBRoutes) {
  test(`Room B reaches its ${route.endingId} ending`, async ({ page }) => {
    const failures = await playRoute(
      page,
      route.roomName,
      [...route.panels],
      { dealSeed: route.dealSeed },
    )

    await expect(
      page.getByRole('heading', {
        level: 1,
        name: route.heading,
      }),
    ).toBeVisible()
    await failures.assertNoFailures()
  })
}
