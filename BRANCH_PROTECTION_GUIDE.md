# Branch Protection Setup Guide

This guide explains how to configure GitHub branch protection rules to ensure Playwright tests pass before merging PRs.

## Prerequisites

- Admin access to the repository
- GitHub Actions workflow for Playwright tests is set up (`.github/workflows/playwright.yml`)

## Setting Up Branch Protection

1. **Navigate to Repository Settings**
   - Go to your repository on GitHub
   - Click on "Settings" tab
   - In the left sidebar, click on "Branches"

2. **Add Branch Protection Rule**
   - Click "Add branch protection rule"
   - In "Branch name pattern", enter: `main`

3. **Configure Required Status Checks**
   - Check ✅ "Require status checks to pass before merging"
   - Check ✅ "Require branches to be up to date before merging"
   - In the search box, type "Playwright Tests" and select it from the list
   - This ensures the Playwright test workflow must pass before PR can be merged

4. **Additional Recommended Settings**
   - Check ✅ "Require a pull request before merging"
     - Set "Required number of approvals before merging" to at least 1 (optional)
   - Check ✅ "Require conversation resolution before merging"
   - Check ✅ "Do not allow bypassing the above settings"

5. **Save Changes**
   - Scroll to the bottom and click "Create" or "Save changes"

## What This Does

With branch protection enabled:

- ✅ All Playwright tests must pass before a PR can be merged
- ✅ PRs must be created (no direct commits to main)
- ✅ Branch must be up to date with main before merging
- ✅ All conversations/comments must be resolved
- ❌ Failing tests will block the merge

## Testing the Protection

1. Create a new branch and make a change
2. Open a pull request to `main`
3. GitHub Actions will automatically run Playwright tests
4. The PR cannot be merged until tests pass (green checkmark)
5. If tests fail, fix the issues and push new commits

## Viewing Test Results

When tests run on a PR:

1. Go to the PR page
2. Scroll to the bottom to see "Checks" section
3. Click on "Playwright Tests" to see details
4. Click "Details" to view the full test report
5. If tests fail, download the test artifacts to see screenshots and traces

## Troubleshooting

### Tests are not showing up as required
- Make sure the workflow has run at least once
- The status check name must match exactly what appears in GitHub Actions
- Wait a few minutes for GitHub to register the workflow

### Tests fail on CI but pass locally
- Check that environment variables are set correctly in CI
- Verify the database is initialized properly in CI
- Review the Playwright test logs and screenshots

### Emergency Bypass
If you need to merge urgently (use with caution):
1. Only repository admins can do this
2. Temporarily disable branch protection
3. Merge the PR
4. Re-enable branch protection immediately
5. Create a follow-up PR to fix the failing tests

## Best Practices

1. **Run tests locally** before pushing:
   ```bash
   npm run test:e2e
   ```

2. **Fix failing tests immediately** - don't let them accumulate

3. **Review test reports** - they often reveal real issues

4. **Keep tests fast** - slow tests discourage running them

5. **Update tests** when adding new features

## Related Files

- `.github/workflows/playwright.yml` - GitHub Actions workflow for Playwright
- `playwright.config.ts` - Playwright configuration
- `e2e/` - Test files directory
