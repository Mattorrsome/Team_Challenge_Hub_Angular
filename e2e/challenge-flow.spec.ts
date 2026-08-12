import { test, expect } from '@playwright/test';

test('create challenge, draft problem statement, edit, accept, appears in list', async ({ page }) => {
  // Unique per run: the dev database persists between runs, and alex.kim is
  // an admin, whose list now shows every user's challenges (not just their
  // own) — a repeated title would collide with earlier runs' rows.
  const title = `Reduce flaky CI builds ${Date.now()}`;

  await page.goto('/sign-in');
  await page.getByLabel('Username').fill('alex.kim');
  await page.getByLabel('Password').fill('ChangeMe123!');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/challenges$/);

  // Create a challenge.
  await page.getByRole('link', { name: 'New Challenge' }).click();
  await page.getByLabel('Title').fill(title);
  await page.getByLabel('Raw notes').fill('CI fails intermittently on the integration suite.');
  await page.getByRole('button', { name: 'Create Challenge' }).click();

  // Draft, edit, and accept the problem statement.
  await page.getByRole('button', { name: 'Draft Problem Statement' }).click();
  const textarea = page.getByLabel('Problem statement (editable)');
  await expect(textarea).not.toHaveValue('');
  await textarea.fill('Problem: CI is flaky. Impact: slows every merge. Context: integration suite only.');
  await page.getByRole('button', { name: 'Accept & Save' }).click();

  await expect(
    page.locator('.challenge-detail__header').getByText('Problem Statement Drafted'),
  ).toBeVisible();

  // Verify it appears in the list with the updated status.
  await page.goto('/challenges');
  const card = page.getByText(title).locator('..');
  await expect(card.getByText('Problem Statement Drafted')).toBeVisible();

  // Delete it from the detail page, accepting the native confirm dialog. The
  // handler must be registered before the click — a pending dialog blocks every
  // later browser action until it is answered.
  await page.getByText(title).click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete' }).click();

  await expect(page).toHaveURL(/\/challenges$/);
  await expect(page.getByText(title)).toHaveCount(0);
});
