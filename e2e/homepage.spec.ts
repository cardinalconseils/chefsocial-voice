import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/');
    
    // Check page title
    await expect(page).toHaveTitle(/ChefSocial/i);
    
    // Check main heading is visible
    await expect(page.getByRole('heading', { name: /Transform Your Voice Into/i })).toBeVisible();
    
    // Check navigation elements
    await expect(page.getByRole('link', { name: 'ChefSocial Voice' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Features' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'How It Works' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Demo' })).toBeVisible();
  });

  test('should navigate to registration page', async ({ page }) => {
    await page.goto('/');
    
    // Click on "Start Free Trial" button
    await page.getByRole('link', { name: 'Start Free Trial' }).first().click();
    
    // Wait for navigation
    await page.waitForURL('**/auth/register');
    
    // Verify we're on the registration page
    await expect(page).toHaveURL(/auth\/register/);
  });

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/');
    
    // Click on "Sign In" link
    await page.getByRole('link', { name: 'Sign In' }).click();
    
    // Wait for navigation
    await page.waitForURL('**/auth/login');
    
    // Verify we're on the login page
    await expect(page).toHaveURL(/auth\/login/);
  });

  test('should navigate to demo page', async ({ page }) => {
    await page.goto('/');
    
    // Click on "Demo" link
    await page.getByRole('link', { name: 'Demo' }).click();
    
    // Wait for navigation
    await page.waitForURL('**/demo');
    
    // Verify we're on the demo page
    await expect(page).toHaveURL(/demo/);
  });
});
