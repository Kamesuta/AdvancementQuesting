const { chromium } = require('@playwright/test')

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })

  // Set auth token in localStorage before navigation
  await page.goto('http://localhost:5174/')
  await page.evaluate(() => {
    localStorage.setItem('auth_token', 'demo-session-token-for-development')
    localStorage.setItem('auth_role', 'editor')
    localStorage.setItem('auth_player', JSON.stringify({ playerName: 'Steve', playerUuid: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', role: 'editor' }))
  })

  await page.goto('http://localhost:5174/editor')
  await page.waitForTimeout(2000)
  await page.screenshot({ path: 'screenshot-editor-authed.png' })
  console.log('Editor screenshot saved')

  // Click on a node to open edit modal
  const nodes = await page.locator('[data-node-id]').all()
  console.log(`Found ${nodes.length} nodes`)

  if (nodes.length > 0) {
    // Switch to edit_quest mode first by clicking toolbar
    const editBtn = page.locator('button[title*="クエスト編集"], button[title*="edit"]').first()
    await editBtn.click().catch(() => console.log('edit button not found by title'))
    await page.waitForTimeout(500)
    await page.screenshot({ path: 'screenshot-editor-mode.png' })

    await nodes[0].click()
    await page.waitForTimeout(1000)
    await page.screenshot({ path: 'screenshot-editor-modal.png' })
    console.log('Modal screenshot saved')

    // Try to click item selector
    const itemSelectorBtn = page.locator('button:has-text("アイテムを変更"), [title*="アイテムを変更"]').first()
    await itemSelectorBtn.click().catch(() => console.log('item selector not found'))
    await page.waitForTimeout(1500)
    await page.screenshot({ path: 'screenshot-item-selector.png' })
    console.log('Item selector screenshot saved')
  }

  await browser.close()
})()
