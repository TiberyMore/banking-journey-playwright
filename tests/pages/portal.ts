import type { Page } from '@playwright/test';
import type { DemoUser } from '../fixtures.js';

export class Portal {
  constructor(readonly page: Page) {}
  async signIn(user: DemoUser) {
    await this.page.goto('/');
    await this.page.getByRole('textbox', { name: 'Email', exact: true }).fill(user.email);
    await this.page.getByLabel('Password', { exact: true }).fill(user.password);
    await this.page.getByRole('button', { name: 'Sign in', exact: true }).click();
  }
  async submit(amount: string) {
    await this.page.getByRole('spinbutton', { name: 'Application amount (USD)' }).fill(amount);
    await this.page.getByRole('button', { name: 'Submit application', exact: true }).click();
  }
}
