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

  await expect(page.getByRole('region', { name: '漫畫分鏡' })).toBeVisible()
  await expect(page.getByRole('region', { name: '故事卡牌' })).toBeVisible()
  await expect(page.getByRole('button', { name: /第 1 格：空格/ })).toBeVisible()
  await expect(page.getByText('第六格尚未揭露')).toBeVisible()
})

test('exact fingerprint unlocks the twelve-frame perfect ending', async ({ page }) => {
  await enterGame(page)
  await fillPerfectRoute(page)
  await revealEnding(page)

  await expect(page.getByRole('heading', {
    name: '完美結局：鎖門之後',
  })).toBeVisible()
  await expect(page.getByText('第 1 / 3 頁')).toBeVisible()
  await expect(page.getByText('perfect_01')).toBeVisible()
  await expect(page.getByText('perfect_04')).toBeVisible()

  await page.getByRole('button', { name: '下一頁' }).click()
  await expect(page.getByText('第 2 / 3 頁')).toBeVisible()
  await expect(page.getByText('perfect_05')).toBeVisible()
})

test('the first character in slot order selects each directed side route', async ({ page }) => {
  await enterGame(page)
  await addCards(page, {
    characters: ['女漂泊者', '相里要'],
    scenes: ['主管樓層走廊', '玻璃會議室', '資料影印室'],
    props: ['萬用門卡', '併購合約', '威士忌酒具'],
  })
  await page.getByRole('button', { name: '演下去' }).click()
  await expect(page.getByText('支線：別太正經')).toBeVisible()
  await page.getByRole('button', { name: '回去重排' }).click()

  await page.getByRole('button', { name: '第 1 格：女漂泊者' }).click()
  await page.getByRole('button', { name: '第 2 格：相里要' }).click()
  await page.getByRole('button', { name: '演下去' }).click()
  await expect(page.getByText('支線：電梯停了')).toBeVisible()
})

test('invalid character count preserves all eight cards', async ({ page }) => {
  await enterGame(page)
  await addCards(page, {
    scenes: [
      '主管樓層走廊',
      '老闆私人辦公室',
      '玻璃會議室',
      '資料影印室',
    ],
    props: ['萬用門卡', '併購合約', '百葉窗遙控器', '威士忌酒具'],
  })

  await page.getByRole('button', { name: '演下去' }).click()

  await expect(page.getByRole('status')).toContainText(
    '只有辦公室和道具，沒人演。重排。',
  )
  for (let slot = 1; slot <= 8; slot += 1) {
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

test('missing art uses labeled placeholders and never overflows the viewport', async ({ page }) => {
  await enterGame(page)

  await expect(page.getByText('office_opening_01')).toBeVisible()
  await expect(page.getByText('card_char_male_rover')).toBeVisible()
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  )
  expect(overflow).toBeLessThanOrEqual(1)

  await resetSave(page)
  await expect(page.getByRole('heading', { name: '成人內容確認' })).toBeVisible()
})
