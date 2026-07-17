import { expect, test } from '@playwright/test'
import { playRoute } from './helpers'

const roomBRoutes = {
  main: {
    heading: '牆後的空間',
    dealSeed: '00000000-0000-4000-8000-000000000904',
    panels: [
      'b1_glass',
      'b2g_record',
      'b3_blueprint',
      'b4_measure',
      'b5_record',
      'b6_open',
    ],
  },
  intimacy: {
    heading: '牆邊的約定',
    dealSeed: '00000000-0000-4000-8000-000000000041',
    panels: [
      'b1_neighbor',
      'b2n_hall',
      'b3_share',
      'b4_comfort',
      'b5_ask',
      'b6_consent',
    ],
  },
  normal: {
    heading: '聲音沉寂之後',
    dealSeed: '00000000-0000-4000-8000-000000000806',
    panels: [
      'b1_glass',
      'b2g_cover',
      'b3_music',
      'b4_leave',
      'b5_ignore',
      'b6_sleep',
    ],
  },
} as const

for (const [endingId, route] of Object.entries(roomBRoutes)) {
  test(`Room B reaches its ${endingId} ending`, async ({ page }) => {
    await playRoute(
      page,
      /牆後的聲音/,
      [...route.panels],
      { dealSeed: route.dealSeed },
    )

    await expect(
      page.getByRole('heading', {
        level: 1,
        name: route.heading,
      }),
    ).toBeVisible()
  })
}
