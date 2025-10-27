# E2E Testing Guide

This guide provides instructions for writing and maintaining end-to-end tests with Playwright.

## Test Structure

Tests are organized in the `e2e/` directory:

```
e2e/
├── homepage.spec.ts    # Homepage navigation and content tests
├── auth.spec.ts        # Authentication flow tests
└── demo.spec.ts        # Demo page tests
```

## Writing Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    // Navigate to a page
    await page.goto('/path');
    
    // Interact with elements
    await page.getByRole('button', { name: 'Click Me' }).click();
    
    // Assert expectations
    await expect(page.getByText('Success')).toBeVisible();
  });
});
```

### Common Patterns

#### Navigation Tests
```typescript
test('should navigate to page', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'About' }).click();
  await expect(page).toHaveURL(/about/);
});
```

#### Form Tests
```typescript
test('should submit form', async ({ page }) => {
  await page.goto('/contact');
  await page.getByLabel('Name').fill('John Doe');
  await page.getByLabel('Email').fill('john@example.com');
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByText('Thank you')).toBeVisible();
});
```

#### Authentication Tests
```typescript
test('should login successfully', async ({ page }) => {
  await page.goto('/auth/login');
  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL(/dashboard/);
});
```

## Best Practices

### 1. Use Semantic Locators
Prefer role-based selectors for better accessibility and maintainability:

```typescript
// ✅ Good - semantic and accessible
await page.getByRole('button', { name: 'Submit' });
await page.getByLabel('Email');
await page.getByText('Welcome');

// ❌ Avoid - fragile and hard to maintain
await page.click('#submit-btn');
await page.locator('.email-input').fill('test@example.com');
```

### 2. Wait for Elements Properly
Playwright auto-waits, but be explicit when needed:

```typescript
// Wait for navigation
await page.waitForURL('**/dashboard');

// Wait for element state
await expect(page.getByRole('button')).toBeEnabled();
```

### 3. Test in Isolation
Each test should be independent:

```typescript
test.beforeEach(async ({ page }) => {
  // Setup before each test
  await page.goto('/');
});

test.afterEach(async ({ page }) => {
  // Cleanup after each test
  await page.close();
});
```

### 4. Use Descriptive Test Names
```typescript
// ✅ Good - clear what's being tested
test('should display error message when login fails with invalid credentials');

// ❌ Bad - unclear what's being tested
test('login test');
```

### 5. Group Related Tests
```typescript
test.describe('User Registration', () => {
  test('should show validation errors for empty form', async ({ page }) => {
    // Test code
  });

  test('should successfully register new user', async ({ page }) => {
    // Test code
  });
});
```

## Running Tests

### Local Development
```bash
# Run all tests
npm run test:e2e

# Run in UI mode (interactive)
npm run test:e2e:ui

# Run specific test file
npx playwright test e2e/homepage.spec.ts

# Run in headed mode (see browser)
npm run test:e2e:headed

# Debug tests
npm run test:e2e:debug
```

### CI/CD
Tests automatically run on:
- Pull requests to `main` branch
- Pushes to `main` branch

## Debugging Failed Tests

### 1. Check Screenshots
When tests fail, Playwright captures screenshots:
```bash
# Screenshots are saved in test-results/
ls test-results/
```

### 2. Use Trace Viewer
For detailed debugging:
```bash
# Generate trace on first retry
npx playwright show-trace test-results/path-to-trace.zip
```

### 3. Run in Debug Mode
```bash
# Opens Playwright Inspector
npm run test:e2e:debug
```

### 4. Check CI Logs
1. Go to the PR page
2. Click on "Details" next to "Playwright Tests"
3. Download artifacts (screenshots, traces)

## Common Issues

### Test Timeout
If tests timeout, increase the timeout:
```typescript
test('slow test', async ({ page }) => {
  test.setTimeout(60000); // 60 seconds
  // Test code
});
```

### Flaky Tests
Avoid flaky tests by:
- Using proper wait conditions
- Avoiding fixed `page.waitForTimeout()`
- Testing stable states, not transitions
- Using auto-retrying assertions

### Environment Variables
Set environment-specific values:
```typescript
const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3004';
```

## Adding New Tests

1. Create a new file in `e2e/` directory:
```bash
touch e2e/new-feature.spec.ts
```

2. Write your tests following the patterns above

3. Run the tests locally:
```bash
npm run test:e2e
```

4. Commit and push - tests will run on CI

## Configuration

Main configuration is in `playwright.config.ts`:
- `testDir`: Test directory location
- `timeout`: Default test timeout
- `retries`: Number of retries on failure
- `workers`: Parallel execution settings
- `webServer`: Dev server configuration

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [API Reference](https://playwright.dev/docs/api/class-playwright)
- [Locators Guide](https://playwright.dev/docs/locators)
