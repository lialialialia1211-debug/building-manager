import { expect, test } from '@playwright/test'
import {
  addCards,
  enterGame,
  fillPerfectRoute,
  resetSave,
  revealEnding,
} from './helpers'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
})

test('adult gate leads directly to the office comic builder', async ({ page }) => {
  await enterGame(page)

  await expect(page).toHaveTitle('鎖門之後｜辦公室漫畫編排器')
  await expect(page.getByRole('region', { name: '漫畫分鏡' })).toBeVisible()
  await expect(page.getByRole('region', { name: '故事卡牌' })).toBeVisible()
  await expect(page.getByRole('button', { name: /第 1 格：空格/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /空格/ })).toHaveCount(4)
  await expect(page.getByText('主線似乎需要兩名人物')).toBeVisible()
  await expect(page.getByText('再放入一個場景與一件關鍵物品'))
    .toBeVisible()
  await expect(page.getByText('第六格尚未揭露')).toBeVisible()
})

test('unordered perfect set unlocks the twelve-frame perfect ending', async ({ page }) => {
  await enterGame(page)
  await fillPerfectRoute(page)
  await revealEnding(page)

  await expect(page.getByRole('heading', {
    name: '完美結局：鎖門之後',
  })).toBeVisible()
  await expect(page.getByText('第 1 / 3 頁')).toBeVisible()
  await expect(page.getByRole('img', { name: '結局分鏡 1' }))
    .toHaveAttribute('src', /perfect_01\.png$/)
  await expect(page.getByRole('img', { name: '結局分鏡 4' }))
    .toHaveAttribute('src', /perfect_04\.png$/)

  await page.getByRole('button', { name: '下一頁' }).click()
  await expect(page.getByText('第 2 / 3 頁')).toBeVisible()
  await expect(page.getByRole('img', { name: '結局分鏡 5' }))
    .toHaveAttribute('src', /perfect_05\.png$/)
})

test('the first character in slot order selects each directed side route', async ({ page }) => {
  await enterGame(page)
  await addCards(page, {
    characters: ['女漂泊者', '相里要'],
    scenes: ['玻璃會議室'],
    props: ['萬用門卡'],
  })
  await page.getByRole('button', { name: '演下去' }).click()
  await expect(page.getByText('支線：別太正經')).toBeVisible()
  const forwardCg = page.getByRole('img', { name: '路線 CG' })
  await expect(forwardCg).toBeVisible()
  const forwardSource = await forwardCg.getAttribute('src')
  await page.getByRole('button', { name: '回去重排' }).click()

  await page.getByRole('button', { name: '第 1 格：女漂泊者' }).click()
  await page.getByRole('button', { name: '第 2 格：相里要' }).click()
  await page.getByRole('button', { name: '演下去' }).click()
  await expect(page.getByText('支線：電梯停了')).toBeVisible()
  const reversedCg = page.getByRole('img', { name: '路線 CG' })
  await expect(reversedCg).toBeVisible()
  await expect(reversedCg).toHaveAttribute('src', forwardSource ?? '')
})

test('three or four characters use the first directed pair and still reveal a CG', async ({ page }) => {
  await enterGame(page)
  await addCards(page, {
    characters: ['長離', '相里要', '女漂泊者', '阿列夫一'],
  })

  await page.getByRole('button', { name: '演下去' }).click()

  await expect(page.getByText('支線：合約歸屬')).toBeVisible()
  await expect(page.getByRole('img', { name: '路線 CG' })).toBeVisible()
  await expect(page.getByRole('button', { name: '閱讀後續' })).toBeVisible()
})

test('fewer than two characters preserves all four cards', async ({ page }) => {
  await enterGame(page)
  await addCards(page, {
    characters: ['男漂泊者'],
    scenes: ['老闆私人辦公室', '玻璃會議室'],
    props: ['萬用門卡'],
  })

  await page.getByRole('button', { name: '演下去' }).click()

  await expect(page.getByRole('status')).toContainText(
    '至少需要兩名人物',
  )
  for (let slot = 1; slot <= 4; slot += 1) {
    await expect(page.getByRole('button', {
      name: new RegExp(`第 ${slot} 格：(?!空格)`),
    })).toBeVisible()
  }
})

test('click, drag, keyboard, and refresh share the same persistent arrangement', async ({ page }) => {
  await enterGame(page)

  const maleCard = page.getByRole('button', { name: '加入男漂泊者' })
  await maleCard.focus()
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: '加入女漂泊者' })
    .dragTo(page.getByRole('button', { name: '第 2 格：空格' }))

  await expect(page.getByRole('button', { name: '第 1 格：男漂泊者' }))
    .toBeVisible()
  await expect(page.getByRole('button', { name: '第 2 格：女漂泊者' }))
    .toBeVisible()

  await page.reload()
  await expect(page.getByRole('heading', { name: '鎖門之後' })).toBeVisible()
  await expect(page.getByRole('button', { name: '第 1 格：男漂泊者' }))
    .toBeVisible()
  await expect(page.getByRole('button', { name: '第 2 格：女漂泊者' }))
    .toBeVisible()
})

test('formal art loads and never overflows the viewport', async ({ page }) => {
  await enterGame(page)

  await expect(page.getByRole('img', { name: '固定開場分鏡' }))
    .toHaveAttribute('src', /office_opening_01\.png$/)
  await expect(page.locator(
    'img[src$="/assets/office-comic/card_char_male_rover.png"]',
  )).toBeVisible()
  await expect(page.getByTestId('asset-placeholder')).toHaveCount(0)
  const overflow = await page.evaluate(
    () => (
      document.documentElement.scrollWidth
      - document.documentElement.clientWidth
    ),
  )
  expect(overflow).toBeLessThanOrEqual(1)

  await resetSave(page)
  await expect(page.getByRole('heading', { name: '成人內容確認' })).toBeVisible()
})
