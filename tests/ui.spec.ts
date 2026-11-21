import { test, expect } from './fixtures.js';
import { Portal } from './pages/portal.js';
import { randomUUID } from 'node:crypto';

test('balance is formatted from integer cents', async ({ page, user }) => {
  await new Portal(page).signIn(user);
  await expect(page.getByRole('heading', { name: 'Client portal', exact: true })).toBeVisible();
  await expect(page.getByTestId('account-email')).toHaveText(user.email);
  await expect(page.getByTestId('balance')).toHaveText('$1,250.75');
});

test('application journey persists the correct amount and status', async ({ page, user }) => {
  const unexpected: string[] = [];
  page.on('response', response => {
    if (new URL(response.url()).pathname.startsWith('/api/') && response.status() >= 400) {
      unexpected.push(`${response.status()} ${new URL(response.url()).pathname}`);
    }
  });
  const portal = new Portal(page);
  await portal.signIn(user);
  const submitted = page.waitForResponse(response => response.url().endsWith('/api/applications') && response.request().method() === 'POST');
  await portal.submit('250.75');
  expect((await submitted).status()).toBe(201);
  await expect(page.getByRole('status')).toHaveText('Application submitted');
  await expect(page.getByRole('list', { name: 'Applications' }).getByRole('listitem')).toHaveText(['$250.75 — submitted']);
  const records = await (await user.api.get('/api/applications')).json();
  expect(records).toHaveLength(1);
  expect(records[0]).toMatchObject({ amountMinor: 25075, status: 'submitted', userId: user.id });
  expect(unexpected).toEqual([]);
});

test('portal displays a record created through the API', async ({ page, user }) => {
  const response = await user.api.post('/api/applications', {
    headers: { 'Idempotency-Key': randomUUID() }, data: { amountMinor: 98765 }
  });
  expect(response.status()).toBe(201);
  await new Portal(page).signIn(user);
  await expect(page.getByRole('list', { name: 'Applications' }).getByRole('listitem')).toHaveText(['$987.65 — submitted']);
});

test('failed sign-in shows an error without exposing the portal', async ({ page, user }) => {
  await new Portal(page).signIn({ ...user, password: 'Incorrect-password' });
  await expect(page.getByRole('alert')).toHaveText('Invalid credentials');
  await expect(page.getByRole('heading', { name: 'Client portal', exact: true })).toBeHidden();
});

test('service outage is visible and a failed submission creates no record', async ({ page, user }) => {
  const portal = new Portal(page);
  await portal.signIn(user);
  await expect(page.getByRole('heading', { name: 'Client portal', exact: true })).toBeVisible();
  await page.route('**/api/applications', async route => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Service temporarily unavailable' }) });
    } else await route.continue();
  });
  await portal.submit('200');
  await expect(page.getByRole('alert')).toHaveText('Service temporarily unavailable');
  await expect(page.getByRole('status')).toBeEmpty();
  await expect(page.getByRole('button', { name: 'Submit application', exact: true })).toBeEnabled();
  expect(await (await user.api.get('/api/applications')).json()).toEqual([]);
});

test('a delayed service response still renders correct data', async ({ page, user }) => {
  await page.route('**/api/account', async route => {
    const response = await route.fetch();
    // Controlled service latency, not a sleep used to synchronize the test.
    await new Promise(resolve => setTimeout(resolve, 350));
    await route.fulfill({ response });
  });
  await new Portal(page).signIn(user);
  await expect(page.getByTestId('balance')).toHaveText('$1,250.75');
});

test('sign-out hides customer data and revokes browser API access', async ({ page, user }) => {
  await new Portal(page).signIn(user);
  await expect(page.getByRole('heading', { name: 'Client portal', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Client portal', exact: true })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
  expect((await page.request.get('/api/account')).status()).toBe(401);
});
