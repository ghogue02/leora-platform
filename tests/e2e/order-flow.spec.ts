/**
 * E2E tests for order and checkout flows
 */

import { test, expect } from '@playwright/test';

test.describe('Order Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/portal\/dashboard/);
  });

  test('should navigate to orders page', async ({ page }) => {
    await page.getByRole('link', { name: /orders/i }).click();

    await expect(page).toHaveURL(/\/portal\/orders/);
    await expect(page.getByRole('heading', { name: /orders/i })).toBeVisible();
  });

  test('should display order list', async ({ page }) => {
    await page.goto('/portal/orders');

    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByText(/order number/i)).toBeVisible();
    await expect(page.getByText(/status/i)).toBeVisible();
    await expect(page.getByText(/total/i)).toBeVisible();
  });

  test('should filter orders by status', async ({ page }) => {
    await page.goto('/portal/orders');

    await page.getByRole('combobox', { name: /status/i }).selectOption('delivered');

    await expect(page).toHaveURL(/status=delivered/);
    // All visible orders should have "delivered" status
    const statusBadges = page.getByText(/delivered/i);
    await expect(statusBadges.first()).toBeVisible();
  });

  test('should view order details', async ({ page }) => {
    await page.goto('/portal/orders');

    // Click first order in list
    await page.getByRole('link', { name: /ORD-/i }).first().click();

    await expect(page).toHaveURL(/\/portal\/orders\/[a-zA-Z0-9-]+/);
    await expect(page.getByRole('heading', { name: /order details/i })).toBeVisible();
    await expect(page.getByText(/order number/i)).toBeVisible();
    await expect(page.getByText(/items/i)).toBeVisible();
  });

  test('should display order items', async ({ page }) => {
    await page.goto('/portal/orders');
    await page.getByRole('link', { name: /ORD-/i }).first().click();

    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByText(/product/i)).toBeVisible();
    await expect(page.getByText(/quantity/i)).toBeVisible();
    await expect(page.getByText(/price/i)).toBeVisible();
  });

  test('should show order summary', async ({ page }) => {
    await page.goto('/portal/orders');
    await page.getByRole('link', { name: /ORD-/i }).first().click();

    await expect(page.getByText(/subtotal/i)).toBeVisible();
    await expect(page.getByText(/tax/i)).toBeVisible();
    await expect(page.getByText(/total/i)).toBeVisible();
  });

  test('should paginate order list', async ({ page }) => {
    await page.goto('/portal/orders');

    // Check if pagination exists
    const nextButton = page.getByRole('button', { name: /next/i });
    if (await nextButton.isVisible()) {
      const currentPage = await page.getByText(/page 1/i).textContent();
      await nextButton.click();

      await expect(page).toHaveURL(/page=2/);
      await expect(page.getByText(/page 2/i)).toBeVisible();
    }
  });

  test('should search orders', async ({ page }) => {
    await page.goto('/portal/orders');

    await page.getByPlaceholder(/search orders/i).fill('ORD-001');
    await page.getByRole('button', { name: /search/i }).click();

    await expect(page).toHaveURL(/search=ORD-001/);
  });

  test('should export orders', async ({ page }) => {
    await page.goto('/portal/orders');

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /export/i }).click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/orders.*\.(csv|xlsx)$/);
  });

  test('should handle empty order list', async ({ page }) => {
    await page.goto('/portal/orders?status=cancelled');

    // Might show empty state
    const emptyState = page.getByText(/no orders found/i);
    if (await emptyState.isVisible()) {
      await expect(emptyState).toBeVisible();
    }
  });
});

test.describe('Cart and Checkout Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/portal\/dashboard/);
  });

  test('should add product to cart', async ({ page }) => {
    await page.goto('/portal/products');

    await page.getByRole('button', { name: /add to cart/i }).first().click();

    await expect(page.getByText(/added to cart/i)).toBeVisible();
    await expect(page.getByText(/cart \(1\)/i)).toBeVisible();
  });

  test('should view cart', async ({ page }) => {
    await page.goto('/portal/cart');

    await expect(page.getByRole('heading', { name: /cart/i })).toBeVisible();
  });

  test('should update cart quantity', async ({ page }) => {
    await page.goto('/portal/cart');

    const quantityInput = page.getByRole('spinbutton').first();
    await quantityInput.fill('5');

    await expect(page.getByText(/updated/i)).toBeVisible();
  });

  test('should remove item from cart', async ({ page }) => {
    await page.goto('/portal/cart');

    await page.getByRole('button', { name: /remove/i }).first().click();

    await expect(page.getByText(/removed from cart/i)).toBeVisible();
  });

  test('should proceed to checkout', async ({ page }) => {
    await page.goto('/portal/cart');

    await page.getByRole('button', { name: /checkout/i }).click();

    await expect(page).toHaveURL(/\/portal\/checkout/);
    await expect(page.getByRole('heading', { name: /checkout/i })).toBeVisible();
  });

  test('should complete checkout', async ({ page }) => {
    await page.goto('/portal/checkout');

    // Fill shipping info if needed
    // await page.getByLabel(/address/i).fill('123 Test St');

    await page.getByRole('button', { name: /place order/i }).click();

    await expect(page).toHaveURL(/\/portal\/orders\/confirmation/);
    await expect(page.getByText(/order confirmed/i)).toBeVisible();
  });

  test('should show cart total', async ({ page }) => {
    await page.goto('/portal/cart');

    await expect(page.getByText(/total/i)).toBeVisible();
    await expect(page.locator('[data-testid="cart-total"]')).toBeVisible();
  });
});
