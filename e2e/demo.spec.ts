import { test, expect } from '@playwright/test';

test.describe('Demo Page', () => {
  test('should load the demo page', async ({ page }) => {
    await page.goto('/demo');
    
    // Check the page loads
    await expect(page).toHaveURL(/demo/);
  });

  test('should have navigation back to home', async ({ page }) => {
    await page.goto('/demo');
    
    // Check for ChefSocial Voice link or home link
    const homeLink = page.getByRole('link', { name: /ChefSocial Voice|Home/i });
    await expect(homeLink).toBeVisible();
  });
});
