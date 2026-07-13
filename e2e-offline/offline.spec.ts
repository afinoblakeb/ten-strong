import { expect, test } from '@playwright/test'

test('launches with bundled program content after the network disappears', async ({ page,context }) => {
  await page.goto('/')
  await page.evaluate(async () => { if ('serviceWorker' in navigator) await navigator.serviceWorker.ready })
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading',{name:/Build practical strength/})).toBeVisible()
  await expect(page.getByText('No account. No analytics.')).toBeVisible()
})
