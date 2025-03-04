import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { test as base, expect } from '@playwright/test';
import { registerAISelector } from '../index';

const test = base.extend<{
  page: Page;
}, { selectorRegistration: void }>({
  // Register selectors once per worker.
  selectorRegistration: [async ({ playwright }, use) => {
    // Register the engine. Selectors will be prefixed with "tag=".
    await registerAISelector({
      apiKey: process.env.LLM_API_KEY || '',
      model: process.env.LLM_MODEL || '',
      baseUrl: process.env.LLM_BASE_URL || '',
    });
    await use();
  }, { scope: 'worker', auto: true }],

  // Launch browser with CORS disabled
  page: async ({}, use) => {
    const browser = await chromium.launch({
      args: ['--disable-web-security']
    });
    const context = await browser.newContext();
    const page = await context.newPage();

    await use(page);

    // Cleanup
    await browser.close();
  },
});

test('should find and click elements using AI locators', async ({ page }) => {
  await page.goto('https://playwright.dev/');

  // Click the get started link using AI locator
  await page.locator('ai=get started link').click();

  // Expects page to have a heading with the name of Installation
  await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
}); 