# Playwright Testing Quick Reference

## Running Tests

```bash
# Run all tests (headless)
npm run test:e2e

# Run with UI (recommended for development)
npm run test:e2e:ui

# Run with visible browser
npm run test:e2e:headed

# Debug mode
npm run test:e2e:debug

# Run specific test file
npx playwright test e2e/homepage.spec.ts

# Run tests matching pattern
npx playwright test --grep "login"
```

## Before Pushing Code

```bash
# Always run tests before pushing
npm run test:e2e

# Check if all tests pass
# Green checkmark = ✅ Ready to push
# Red X = ❌ Fix failing tests first
```

## Writing Tests

### Basic Test Structure
```typescript
import { test, expect } from '@playwright/test';

test('description of what it tests', async ({ page }) => {
  // 1. Navigate
  await page.goto('/path');
  
  // 2. Interact
  await page.getByRole('button', { name: 'Click' }).click();
  
  // 3. Assert
  await expect(page.getByText('Success')).toBeVisible();
});
```

### Common Locators
```typescript
// By role (preferred - accessible)
page.getByRole('button', { name: 'Submit' })
page.getByRole('link', { name: 'Home' })
page.getByRole('heading', { name: 'Title' })

// By label (forms)
page.getByLabel('Email')
page.getByLabel('Password')

// By text
page.getByText('Welcome')
page.getByText(/pattern/i)

// By placeholder
page.getByPlaceholder('Enter your email')

// By test id (if added)
page.getByTestId('submit-button')
```

### Common Actions
```typescript
// Navigation
await page.goto('/path');
await page.goBack();
await page.reload();

// Clicking
await page.getByRole('button').click();
await page.getByRole('button').dblclick();

// Typing
await page.getByLabel('Email').fill('test@example.com');
await page.getByLabel('Email').type('test@example.com');

// Selecting
await page.getByRole('combobox').selectOption('value');
await page.getByRole('checkbox').check();
await page.getByRole('radio').check();

// Waiting
await page.waitForURL('**/dashboard');
await page.waitForLoadState('networkidle');
await expect(page.getByText('Loaded')).toBeVisible();
```

### Common Assertions
```typescript
// Visibility
await expect(page.getByText('Hello')).toBeVisible();
await expect(page.getByText('Hidden')).toBeHidden();

// URL
await expect(page).toHaveURL(/dashboard/);
await expect(page).toHaveURL('http://localhost:3004/login');

// Text content
await expect(page.getByRole('heading')).toHaveText('Welcome');
await expect(page.getByRole('heading')).toContainText('Wel');

// Form state
await expect(page.getByRole('button')).toBeEnabled();
await expect(page.getByRole('button')).toBeDisabled();
await expect(page.getByRole('checkbox')).toBeChecked();

// Count
await expect(page.getByRole('listitem')).toHaveCount(5);
```

## Debugging Failed Tests

### 1. Check Screenshots
```bash
# Screenshots are saved in test-results/
ls test-results/
```

### 2. View HTML Report
```bash
# Generate and view report
npx playwright show-report
```

### 3. Use Trace Viewer
```bash
# For detailed debugging
npx playwright show-trace test-results/path-to-trace.zip
```

### 4. Run in UI Mode
```bash
# Interactive debugging
npm run test:e2e:ui
```

## CI/CD

### When Tests Run
- On every PR to `main`
- On every push to `main`

### How to Check Results
1. Go to PR page
2. Look for "Playwright Tests" check
3. Click "Details" to see results
4. Download artifacts if tests failed

### If Tests Fail on CI
1. Download test artifacts
2. Review screenshots and traces
3. Fix the issue locally
4. Run tests locally to verify fix
5. Push the fix

## Best Practices

✅ **DO:**
- Run tests before pushing
- Use semantic locators (getByRole, getByLabel)
- Keep tests independent
- Test user workflows, not implementation
- Add tests for new features
- Fix failing tests immediately

❌ **DON'T:**
- Push without running tests
- Use CSS selectors or XPath
- Make tests depend on each other
- Use hard-coded waits (waitForTimeout)
- Skip or disable failing tests
- Test internal implementation details

## Getting Help

1. Check `E2E_TESTING_GUIDE.md` for detailed guide
2. Check Playwright docs: https://playwright.dev
3. Ask team members
4. Check test examples in `e2e/` directory

## File Locations

- **Tests**: `e2e/*.spec.ts`
- **Config**: `playwright.config.ts`
- **Workflow**: `.github/workflows/playwright.yml`
- **Results**: `test-results/`
- **Reports**: `playwright-report/`

---

**Remember**: Tests are your safety net. Keep them green! 🟢
