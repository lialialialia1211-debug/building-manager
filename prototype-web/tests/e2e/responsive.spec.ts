import { expect, test } from '@playwright/test'
import { playRoute } from './helpers'

test('keeps the complete comic choice UI inside the viewport', async ({
  page,
}) => {
  await playRoute(page, /停電之夜/, [])

  const viewport = page.viewportSize()
  expect(viewport).not.toBeNull()

  const tray = page.locator('.candidate-tray')
  const trayBox = await tray.boundingBox()
  expect(trayBox).not.toBeNull()
  expect(trayBox!.x).toBeGreaterThanOrEqual(0)
  expect(trayBox!.x + trayBox!.width)
    .toBeLessThanOrEqual(viewport!.width)

  const candidates = page.locator('.candidate-card')
  await expect(candidates).toHaveCount(12)
  for (const candidate of await candidates.all()) {
    await expect(candidate).toBeVisible()
    const box = await candidate.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width)
      .toBeLessThanOrEqual(viewport!.width)
  }

  const documentSize = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(documentSize.scrollWidth)
    .toBeLessThanOrEqual(documentSize.clientWidth)

  const comicPageBox = await page.locator('.comic-page').boundingBox()
  expect(comicPageBox).not.toBeNull()
  expect(comicPageBox!.width).toBeGreaterThanOrEqual(640)
  expect(comicPageBox!.height).toBeGreaterThanOrEqual(360)

  const statusBox = await page.getByTestId('status-strip').boundingBox()
  expect(statusBox).not.toBeNull()
  expect(statusBox!.y + statusBox!.height)
    .toBeLessThanOrEqual(trayBox!.y)

  const comicFontSizes = await page.locator([
    '.comic-screen button',
    '.comic-screen p',
    '.comic-screen .status-item',
  ].join(', ')).evaluateAll((elements) =>
    elements.map((element) =>
      Number.parseFloat(getComputedStyle(element).fontSize),
    ),
  )
  expect(Math.min(...comicFontSizes)).toBeGreaterThanOrEqual(16)
})

test.describe('small viewport comic flow', () => {
  test.use({ viewport: { width: 600, height: 900 } })

  test('stacks every comic panel before the candidate tray', async ({
    page,
  }) => {
    await playRoute(page, /停電之夜/, [])

    const openingBox = await page
      .getByTestId('comic-opening')
      .boundingBox()
    const endingBox = await page
      .getByTestId('comic-ending')
      .boundingBox()
    const comicPageBox = await page.locator('.comic-page').boundingBox()
    const trayBox = await page.locator('.candidate-tray').boundingBox()

    expect(openingBox).not.toBeNull()
    expect(endingBox).not.toBeNull()
    expect(comicPageBox).not.toBeNull()
    expect(trayBox).not.toBeNull()

    const panelBoxes = await page
      .locator('.comic-page .comic-panel')
      .evaluateAll((panels) =>
        panels.map((panel) => {
          const box = panel.getBoundingClientRect()
          return {
            top: box.top,
            right: box.right,
            bottom: box.bottom,
            left: box.left,
          }
        }),
      )

    expect(panelBoxes).toHaveLength(8)
    for (const [index, panelBox] of panelBoxes.entries()) {
      expect(panelBox.left).toBeGreaterThanOrEqual(comicPageBox!.x)
      expect(panelBox.right)
        .toBeLessThanOrEqual(comicPageBox!.x + comicPageBox!.width)
      const previousBox = panelBoxes[index - 1]
      if (previousBox) {
        expect(panelBox.top)
          .toBeGreaterThanOrEqual(previousBox.bottom)
      }
    }

    expect(openingBox!.y).toBeGreaterThanOrEqual(comicPageBox!.y)
    expect(endingBox!.y)
      .toBeGreaterThanOrEqual(openingBox!.y + openingBox!.height)
    expect(endingBox!.y + endingBox!.height)
      .toBeLessThanOrEqual(comicPageBox!.y + comicPageBox!.height)
    expect(trayBox!.y)
      .toBeGreaterThanOrEqual(comicPageBox!.y + comicPageBox!.height)

    const documentSize = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }))
    expect(documentSize.scrollWidth)
      .toBeLessThanOrEqual(documentSize.clientWidth)
  })
})
