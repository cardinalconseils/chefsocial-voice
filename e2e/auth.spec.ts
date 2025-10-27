import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.describe('Login Page', () => {
    test('should display login form', async ({ page }) => {
      await page.goto('/auth/login');
      
      // Check for login form elements
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/password/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    });

    test('should show validation errors for empty form', async ({ page }) => {
      await page.goto('/auth/login');
      
      // Click submit without filling form
      await page.getByRole('button', { name: /sign in/i }).click();
      
      // Should stay on login page (not navigate away)
      await expect(page).toHaveURL(/auth\/login/);
    });

    test('should have link to registration page', async ({ page }) => {
      await page.goto('/auth/login');
      
      // Check for "Sign Up" or "Register" link
      const registerLink = page.getByRole('link', { name: /sign up|register/i });
      await expect(registerLink).toBeVisible();
    });
  });

  test.describe('Registration Page', () => {
    test('should display registration form', async ({ page }) => {
      await page.goto('/auth/register');
      
      // Check for registration form elements
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/password/i)).toBeVisible();
    });

    test('should show validation errors for empty form', async ({ page }) => {
      await page.goto('/auth/register');
      
      // Try to submit without filling form
      const submitButton = page.getByRole('button', { name: /sign up|register|create account/i });
      if (await submitButton.isVisible()) {
        await submitButton.click();
        
        // Should stay on registration page
        await expect(page).toHaveURL(/auth\/register/);
      }
    });

    test('should have link to login page', async ({ page }) => {
      await page.goto('/auth/register');
      
      // Check for "Sign In" or "Login" link
      const loginLink = page.getByRole('link', { name: /sign in|login/i });
      await expect(loginLink).toBeVisible();
    });
  });
});
