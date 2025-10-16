/**
 * E2E tests for authentication flows
 */

import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should login with valid credentials', async ({ page }) => {
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/portal\/dashboard/);
    await expect(page.getByText(/welcome/i)).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.getByLabel(/email/i).fill('wrong@example.com');
    await page.getByLabel(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.getByText(/invalid credentials/i)).toBeVisible();
    await expect(page).toHaveURL(/\//); // Stay on login page
  });

  test('should validate email format', async ({ page }) => {
    await page.getByLabel(/email/i).fill('invalid-email');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.getByText(/invalid email/i)).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.getByText(/email is required/i)).toBeVisible();
    await expect(page.getByText(/password is required/i)).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/portal\/dashboard/);

    // Logout
    await page.getByRole('button', { name: /logout/i }).click();

    await expect(page).toHaveURL(/\//);
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
  });

  test('should remember user session', async ({ page, context }) => {
    // Login
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/portal\/dashboard/);

    // Close and reopen page
    await page.close();
    const newPage = await context.newPage();
    await newPage.goto('/portal/dashboard');

    // Should still be logged in
    await expect(newPage).toHaveURL(/\/portal\/dashboard/);
  });

  test('should redirect to login when accessing protected route', async ({ page }) => {
    await page.goto('/portal/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL(/\//);
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
  });

  test('should handle session expiration', async ({ page }) => {
    // Login
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/portal\/dashboard/);

    // Simulate session expiration by clearing cookies
    await page.context().clearCookies();

    // Try to access protected route
    await page.reload();

    // Should redirect to login
    await expect(page).toHaveURL(/\//);
  });

  test('should toggle password visibility', async ({ page }) => {
    const passwordInput = page.getByLabel(/password/i);

    await expect(passwordInput).toHaveAttribute('type', 'password');

    await page.getByRole('button', { name: /show password/i }).click();
    await expect(passwordInput).toHaveAttribute('type', 'text');

    await page.getByRole('button', { name: /hide password/i }).click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });
});
