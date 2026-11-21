import { test as base, expect, type APIRequestContext } from '@playwright/test';
import { randomUUID } from 'node:crypto';

export type DemoUser = { id: string; email: string; password: string; api: APIRequestContext };
type Fixtures = { user: DemoUser; createUser: () => Promise<DemoUser> };

export const test = base.extend<Fixtures>({
  createUser: async ({ playwright, baseURL }, use) => {
    const contexts: APIRequestContext[] = [];
    await use(async () => {
      const api = await playwright.request.newContext({ baseURL });
      contexts.push(api);
      const email = `qa-${randomUUID()}@example.test`;
      const password = 'SyntheticOnly-123!';
      const registration = await api.post('/api/users', { data: { email, password } });
      expect(registration.status(), 'Fixture registration').toBe(201);
      const { id } = await registration.json();
      const login = await api.post('/api/login', { data: { email, password } });
      expect(login.status(), 'Fixture login').toBe(200);
      return { id, email, password, api };
    });
    // The server is disposable; no global resets that would race parallel tests.
    for (const context of contexts) await context.dispose();
  },
  user: async ({ createUser }, use) => { await use(await createUser()); }
});
export { expect };
