import { test, expect } from '@playwright/test';

test('sign up, create a challenge, sign out, sign back in, challenge persists', async ({ page }) => {
  // Unique per run: the dev database persists between runs.
  const username = `e2e.user.${Date.now()}`;
  const password = 'SuperSecret1';
  const title = `E2E challenge ${username}`;

  // Any route redirects to sign-in when unauthenticated.
  await page.goto('/challenges');
  await expect(page).toHaveURL(/\/sign-in$/);

  await page.getByRole('link', { name: 'Create one' }).click();
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Create account' }).click();

  // Landed on the list, scoped to this brand-new user — so it's empty.
  await expect(page).toHaveURL(/\/challenges$/);
  // A brand-new user's list is empty because the fetch is scoped to their id.
  // An unscoped list would show the seeded users' challenges instead.
  await expect(page.getByText('No challenges yet.')).toBeVisible();

  await page.getByRole('link', { name: 'New Challenge' }).click();
  await page.getByLabel('Title').fill(title);
  await page.getByLabel('Raw notes').fill('Created by the auth e2e flow.');
  await page.getByRole('button', { name: 'Create Challenge' }).click();

  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/sign-in$/);

  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/challenges$/);
  await expect(page.getByText(title)).toBeVisible();
});

test('a collaborator gets no admin link and is redirected away from /admin/users', async ({ page }) => {
  const username = `e2e.collab.${Date.now()}`;

  await page.goto('/sign-up');
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill('SuperSecret1');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/challenges$/);

  // Wait for the toolbar to render before asserting the admin link's absence,
  // so a not-yet-painted nav can't make this pass for the wrong reason.
  await expect(page.locator('.app-username')).toHaveText(username);
  await expect(page.getByRole('link', { name: 'Users' })).toBeHidden();

  await page.goto('/admin/users');
  await expect(page).toHaveURL(/\/challenges$/);
});
