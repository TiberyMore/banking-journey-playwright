import { test, expect } from './fixtures.js';
import { randomUUID } from 'node:crypto';

test('anonymous requests cannot read account data', async ({ request }) => {
  const response = await request.get('/api/account');
  expect(response.status()).toBe(401);
  expect(await response.json()).toEqual({ error: 'Sign in required' });
});

test('account contract uses integer cents and the authenticated identity', async ({ user }) => {
  const response = await user.api.get('/api/account');
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ email: user.email, balanceMinor: 125075, currency: 'USD' });
});

for (const amountMinor of [10000, 1000000]) {
  test(`accepts inclusive amount boundary ${amountMinor}`, async ({ user }) => {
    const response = await user.api.post('/api/applications', {
      headers: { 'Idempotency-Key': randomUUID() }, data: { amountMinor }
    });
    expect(response.status()).toBe(201);
    expect(await response.json()).toMatchObject({ amountMinor, userId: user.id, status: 'submitted', currency: 'USD' });
  });
}

for (const amountMinor of [9999, 1000001, 10000.5, '10000']) {
  test(`rejects invalid amount ${JSON.stringify(amountMinor)} without creating a record`, async ({ user }) => {
    const response = await user.api.post('/api/applications', {
      headers: { 'Idempotency-Key': randomUUID() }, data: { amountMinor }
    });
    expect(response.status()).toBe(422);
    expect(await response.json()).toHaveProperty('error');
    expect(await (await user.api.get('/api/applications')).json()).toEqual([]);
  });
}

test('concurrent retries with the same key create exactly one application', async ({ user }) => {
  const headers = { 'Idempotency-Key': randomUUID() };
  const responses = await Promise.all(Array.from({ length: 3 }, () =>
    user.api.post('/api/applications', { headers, data: { amountMinor: 25000 } })));
  expect(responses.map(response => response.status()).sort()).toEqual([200, 200, 201]);
  const bodies = await Promise.all(responses.map(response => response.json()));
  expect(new Set(bodies.map(body => body.id)).size).toBe(1);
  const records = await (await user.api.get('/api/applications')).json();
  expect(records).toHaveLength(1);
  expect(records[0]).toMatchObject({ amountMinor: 25000, status: 'submitted' });
});

test('a reused key with a different payload is rejected', async ({ user }) => {
  const headers = { 'Idempotency-Key': randomUUID() };
  expect((await user.api.post('/api/applications', { headers, data: { amountMinor: 25000 } })).status()).toBe(201);
  const response = await user.api.post('/api/applications', { headers, data: { amountMinor: 35000 } });
  expect(response.status()).toBe(409);
  const records = await (await user.api.get('/api/applications')).json();
  expect(records).toHaveLength(1);
  expect(records[0].amountMinor).toBe(25000);
});

test('an authenticated user cannot read another user’s application', async ({ user, createUser }) => {
  const other = await createUser();
  const created = await user.api.post('/api/applications', {
    headers: { 'Idempotency-Key': randomUUID() }, data: { amountMinor: 25000 }
  });
  expect(created.status()).toBe(201);
  const record = await created.json();
  expect((await other.api.get(`/api/applications/${record.id}`)).status()).toBe(404);
  expect(await (await other.api.get('/api/applications')).json()).toEqual([]);
  expect((await user.api.get(`/api/applications/${record.id}`)).status()).toBe(200);
});

test('malformed JSON produces a controlled error', async ({ user }) => {
  const response = await user.api.post('/api/applications', {
    headers: { 'Content-Type': 'application/json' }, data: Buffer.from('{')
  });
  expect(response.status()).toBe(400);
  expect(await response.json()).toEqual({ error: 'Invalid JSON' });
});

test('logout invalidates the server session', async ({ user }) => {
  expect((await user.api.post('/api/logout')).status()).toBe(200);
  expect((await user.api.get('/api/account')).status()).toBe(401);
});
