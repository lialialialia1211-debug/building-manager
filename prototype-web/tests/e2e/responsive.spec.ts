import { expect, test, type Page } from '@playwright/test'
import { roomARoutes } from './ending-routes'
import { playRoute } from './helpers'

const route = roomARoutes[0]!

async function expectNoHorizontalScroll(page: Page) {
  const documentSize = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(documentSize.scrollWidth)
    .toBeLessThanOrEqual(documentSize.clientWidth)
}

test('keeps the complete route and gallery responsive', async ({ page }) => {
  const viewport = page.viewportSize()
  expect(viewport).not.toBeNull()

  const failures = await playRoute(
    page,
    route.roomName,
    [...route.panels],
    {
      dealSeed: route.dealSeed,
      requireOpening: true,
      onBuilding: async (currentPage) => {
        await expect(currentPage.getByTestId('building-screen'))
          .toBeVisible()
        await expectNoHorizontalScroll(currentPage)
      },
      onOpening: async (currentPage) => {
        await expect(currentPage.getByRole('region', {
          name: /停電之夜開場/,
        })).toBeVisible()
        await expect(currentPage.getByRole('button', {
          name: '跳過開場',
        })).toBeVisible()
        await expectNoHorizontalScroll(currentPage)
      },
      onComic: async (currentPage) => {
        await expect(currentPage.getByTestId('comic-choice-slot'))
          .toHaveCount(6)
        await expect(currentPage.getByRole('button', {
          name: '確認編排並揭曉',
        })).toBeVisible()
        await expectNoHorizontalScroll(currentPage)
      },
      onResult: async (currentPage) => {
        await expect(currentPage.getByTestId('result-screen'))
          .toBeVisible()
        await expectNoHorizontalScroll(currentPage)

        if (viewport?.width === 1280 && viewport.height === 720) {
          const playerBox = await currentPage
            .locator('.cinematic-player')
            .boundingBox()
          const actionsBox = await currentPage
            .locator('.result-actions')
            .boundingBox()
          expect(playerBox).not.toBeNull()
          expect(actionsBox).not.toBeNull()
          expect(actionsBox!.y).toBeGreaterThanOrEqual(
            playerBox!.y + playerBox!.height,
          )
        }
      },
    },
  )

  await page.getByRole('button', { name: '返回大樓' }).click()
  await expect(page.getByTestId('building-screen')).toBeVisible()
  await page.getByRole('button', { name: '圖鑑' }).click()
  await expect(page.getByTestId('gallery-screen')).toBeVisible()
  await expect(page.locator('.gallery-replay .cinematic-player'))
    .toBeVisible()
  await expectNoHorizontalScroll(page)
  await failures.assertNoFailures()
})

test.describe('reduced motion', () => {
  test('advances cinematic frames without transform animation', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await playRoute(
      page,
      route.roomName,
      [...route.panels],
      { dealSeed: route.dealSeed },
    )

    const player = page.locator('.cinematic-player')
    await player.getByRole('button', { name: '暫停' }).click()
    const stage = page.getByTestId('cinematic-stage')
    const before = await stage.getAttribute('data-asset-id')
    await player.getByRole('button', { name: '下一格' }).click()
    await expect(stage).not.toHaveAttribute('data-asset-id', before ?? '')
    expect(await page.evaluate(() => matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches)).toBe(true)

    const motionStyles = await player.locator([
      '.cinematic-current-layer',
      '.cinematic-frame',
    ].join(', ')).evaluateAll((elements) => elements.map((element) => {
      const style = getComputedStyle(element)
      return {
        animationName: style.animationName,
        transform: style.transform,
      }
    }))
    expect(motionStyles.length).toBeGreaterThan(0)
    for (const style of motionStyles) {
      expect(style.animationName).toBe('none')
      expect(style.transform).toBe('none')
    }
  })
})
