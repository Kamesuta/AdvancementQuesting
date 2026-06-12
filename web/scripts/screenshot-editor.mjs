import { chromium } from '@playwright/test'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })

await page.goto('http://localhost:5174/')
await page.evaluate(() => {
  localStorage.setItem('token', 'demo-session-token-for-development')
})
await page.reload()
await page.waitForTimeout(2500)

await page.screenshot({ path: 'screenshot-1-editor.png' })
console.log('1. Editor with PNG textures')

// Switch to edit_quest mode (4th toolbar button)
const sidebarBtns = page.locator('.relative.group button')
await sidebarBtns.nth(3).click()
await page.waitForTimeout(300)

// Click first node to open quest editor modal
const nodes = page.locator('[data-node-id]')
await nodes.first().click()
await page.waitForTimeout(1200)
await page.screenshot({ path: 'screenshot-2-quest-modal.png' })
console.log('2. Quest editor modal')

// Click the icon in the modal header (title="アイコンを変更")
const iconArea = page.locator('[title="アイコンを変更"]').first()
const iconCount = await iconArea.count()
console.log(`Icon area: ${iconCount}`)

if (iconCount > 0) {
  await iconArea.click()
  await page.waitForTimeout(2000) // wait for items to load
  await page.screenshot({ path: 'screenshot-3-item-selector.png' })
  console.log('3. Item selector')

  // Count items
  const itemCount = await page.locator('[title*="("]').count()
  console.log(`Items in selector: ${itemCount}`)
}

await browser.close()
