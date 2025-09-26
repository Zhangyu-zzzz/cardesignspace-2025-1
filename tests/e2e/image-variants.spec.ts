import { test, expect } from '@playwright/test'

const FRONTEND_BASE = process.env.E2E_BASE_URL || 'http://localhost:8080'

test.describe('Image variants on-demand generation', () => {
  test('requests best variant for gallery images', async ({ page }) => {
    let bestRequests = 0

    // Count via routing
    await page.route('**/api/image-variants/best/**', route => {
      bestRequests += 1
      route.continue()
    })

    // Count via request events (in case routing misses)
    page.on('request', req => {
      if (req.url().includes('/api/image-variants/best/')) bestRequests += 1
    })

    // Log console errors for debugging
    page.on('console', msg => {
      const text = msg.text()
      if (text.includes('/api/image-variants/best/')) bestRequests += 1
      if (msg.type() === 'error') console.log('console.error:', text)
      if (msg.type() === 'log') console.log('console.log:', text)
    })

    const imagesListPromise = page.waitForResponse(resp =>
      resp.url().includes('/api/image-gallery/images') && resp.status() === 200
    )

    await page.goto(`${FRONTEND_BASE}/image-gallery`)
    await imagesListPromise
    await page.waitForSelector('.image-card img', { timeout: 20000 })
    await page.waitForTimeout(5000)

    expect(bestRequests).toBeGreaterThan(0)
  })
})
