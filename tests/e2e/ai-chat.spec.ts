/**
 * E2E tests for AI chat interactions
 */

import { test, expect } from '@playwright/test';

test.describe('AI Chat Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/portal\/dashboard/);
  });

  test('should display AI chat interface on dashboard', async ({ page }) => {
    await page.goto('/portal/dashboard');

    await expect(page.getByPlaceholder(/ask leora/i)).toBeVisible();
  });

  test('should send message to Leora', async ({ page }) => {
    await page.goto('/portal/dashboard');

    const chatInput = page.getByPlaceholder(/ask leora/i);
    await chatInput.fill('Show me my recent orders');
    await chatInput.press('Enter');

    // Should show loading state
    await expect(page.getByText(/thinking/i)).toBeVisible();

    // Should receive response
    await expect(page.getByText(/recent orders/i)).toBeVisible({ timeout: 10000 });
  });

  test('should display proactive insights', async ({ page }) => {
    await page.goto('/portal/dashboard');

    // AI briefing card should be visible
    await expect(page.getByRole('heading', { name: /insights/i })).toBeVisible();
  });

  test('should handle multiple messages', async ({ page }) => {
    await page.goto('/portal/dashboard');

    const chatInput = page.getByPlaceholder(/ask leora/i);

    // First message
    await chatInput.fill('What is my total spend?');
    await chatInput.press('Enter');
    await page.waitForTimeout(2000);

    // Second message
    await chatInput.fill('Show top products');
    await chatInput.press('Enter');

    // Both responses should be visible
    await expect(page.getByText(/total spend/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/top products/i)).toBeVisible({ timeout: 10000 });
  });

  test('should show suggested questions', async ({ page }) => {
    await page.goto('/portal/dashboard');

    await expect(page.getByText(/suggested questions/i)).toBeVisible();

    const suggestions = page.getByRole('button', { name: /show/i });
    await expect(suggestions.first()).toBeVisible();
  });

  test('should click suggested question', async ({ page }) => {
    await page.goto('/portal/dashboard');

    await page.getByRole('button', { name: /show my recent orders/i }).click();

    // Should populate chat and send
    await expect(page.getByText(/recent orders/i)).toBeVisible({ timeout: 10000 });
  });

  test('should display data visualizations', async ({ page }) => {
    await page.goto('/portal/dashboard');

    const chatInput = page.getByPlaceholder(/ask leora/i);
    await chatInput.fill('Show revenue chart for last 30 days');
    await chatInput.press('Enter');

    // Should display chart
    await expect(page.locator('canvas, svg')).toBeVisible({ timeout: 10000 });
  });

  test('should handle errors gracefully', async ({ page }) => {
    await page.goto('/portal/dashboard');

    // Intercept API to simulate error
    await page.route('**/api/leora/chat', (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Service unavailable' }),
      });
    });

    const chatInput = page.getByPlaceholder(/ask leora/i);
    await chatInput.fill('Test error');
    await chatInput.press('Enter');

    await expect(page.getByText(/unable to process/i)).toBeVisible();
  });

  test('should show typing indicator', async ({ page }) => {
    await page.goto('/portal/dashboard');

    const chatInput = page.getByPlaceholder(/ask leora/i);
    await chatInput.fill('Test message');
    await chatInput.press('Enter');

    // Should show typing indicator
    await expect(page.getByTestId('typing-indicator')).toBeVisible();
  });

  test('should link to detailed views', async ({ page }) => {
    await page.goto('/portal/dashboard');

    const chatInput = page.getByPlaceholder(/ask leora/i);
    await chatInput.fill('Show accounts at risk');
    await chatInput.press('Enter');

    await expect(page.getByRole('link', { name: /view details/i })).toBeVisible({
      timeout: 10000,
    });

    await page.getByRole('link', { name: /view details/i }).first().click();

    // Should navigate to detail page
    await expect(page).toHaveURL(/\/portal\/accounts/);
  });

  test('should clear chat history', async ({ page }) => {
    await page.goto('/portal/dashboard');

    // Send a message
    const chatInput = page.getByPlaceholder(/ask leora/i);
    await chatInput.fill('Test message');
    await chatInput.press('Enter');

    await page.waitForTimeout(2000);

    // Clear history
    await page.getByRole('button', { name: /clear chat/i }).click();

    // Confirm clear
    await page.getByRole('button', { name: /confirm/i }).click();

    // Chat should be empty
    await expect(page.getByText(/test message/i)).not.toBeVisible();
  });

  test('should maintain context across messages', async ({ page }) => {
    await page.goto('/portal/dashboard');

    const chatInput = page.getByPlaceholder(/ask leora/i);

    // First message
    await chatInput.fill('Show my orders');
    await chatInput.press('Enter');
    await page.waitForTimeout(2000);

    // Follow-up question (should understand context)
    await chatInput.fill('Which ones are pending?');
    await chatInput.press('Enter');

    await expect(page.getByText(/pending orders/i)).toBeVisible({ timeout: 10000 });
  });

  test('should handle no data scenarios', async ({ page }) => {
    await page.goto('/portal/dashboard');

    const chatInput = page.getByPlaceholder(/ask leora/i);
    await chatInput.fill('Show data for account XYZ123');
    await chatInput.press('Enter');

    await expect(page.getByText(/no data.*found/i)).toBeVisible({ timeout: 10000 });
  });
});
