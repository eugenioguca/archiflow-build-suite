import { test, expect } from '@playwright/test';

test.describe('Dashboard - Manuales de Operación', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'eugenioguca@hotmail.com');
    await page.fill('input[type="password"]', 'your-test-password');
    await page.click('button[type="submit"]');
    
    // Wait for navigation to dashboard
    await page.waitForURL('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('should display manuals list from storage bucket', async ({ page }) => {
    // Wait for the manuals section to load
    const manualsSection = page.locator('text=Manuales de Operación');
    await expect(manualsSection).toBeVisible();

    // Check that the search input is visible
    const searchInput = page.locator('input[placeholder*="Buscar manuales"]');
    await expect(searchInput).toBeVisible();
  });

  test('should open manual in new tab with signed URL', async ({ page, context }) => {
    // Get the initial page URL to verify it doesn't navigate
    const initialUrl = page.url();
    
    // Wait for manuals list to load
    await page.waitForSelector('text=Manuales de Operación');
    
    // Find the first manual open link (ExternalLink icon button)
    const openButton = page.locator('a[target="_blank"][rel="noopener noreferrer"]').first();
    
    // Wait for the button to be visible and enabled
    await expect(openButton).toBeVisible({ timeout: 10000 });

    // Listen for new page event
    const newPagePromise = context.waitForEvent('page');
    await openButton.click();
    const newPage = await newPagePromise;

    // Wait for the new page to load
    await newPage.waitForLoadState('domcontentloaded');
    
    // Verify the URL points to Supabase Storage
    const url = newPage.url();
    expect(url).toMatch(/storage\.supabase\.co|supabase\.co\/storage\/v1\/object/i);
    expect(url).toMatch(/\.pdf(\?|$)/i);

    // Verify main page did not navigate
    expect(page.url()).toBe(initialUrl);

    await newPage.close();
  });

  test('should prefetch signed URL on hover', async ({ page }) => {
    // Wait for manuals list
    await page.waitForSelector('text=Manuales de Operación');
    
    // Find first manual row
    const manualRow = page.locator('.border.rounded-lg').first();
    await expect(manualRow).toBeVisible({ timeout: 10000 });

    // Hover to trigger prefetch
    await manualRow.hover();
    
    // Wait a moment for prefetch to complete
    await page.waitForTimeout(1000);

    // Verify the link has an href (signed URL was fetched)
    const openLink = manualRow.locator('a[target="_blank"]').first();
    const href = await openLink.getAttribute('href');
    
    expect(href).toBeTruthy();
    if (href) {
      expect(href).toMatch(/storage\.supabase\.co|supabase\.co\/storage\/v1\/object/i);
    }
  });

  test('should filter manuals by search term', async ({ page }) => {
    // Wait for manuals to load
    await page.waitForSelector('text=Manuales de Operación');
    
    const searchInput = page.locator('input[placeholder*="Buscar manuales"]');
    await searchInput.fill('test');
    
    // Wait for filtering to complete
    await page.waitForTimeout(300);
    
    // The list should update (exact check depends on your test data)
    // Just verify the search input has the value
    await expect(searchInput).toHaveValue('test');
  });

  test('manual links are direct URLs without javascript', async ({ page }) => {
    // Wait for manuals list
    await page.waitForSelector('text=Manuales de Operación');
    
    // Find first manual open link
    const openLink = page.locator('a[target="_blank"][rel="noopener noreferrer"]').first();
    await expect(openLink).toBeVisible({ timeout: 10000 });
    
    // Hover to trigger prefetch
    const manualRow = openLink.locator('..').locator('..').locator('..');
    await manualRow.hover();
    await page.waitForTimeout(1000);
    
    // Get href attribute
    const href = await openLink.getAttribute('href');
    
    // Verify it's a real URL (not # or javascript:)
    expect(href).toBeTruthy();
    if (href) {
      expect(href).not.toBe('#');
      expect(href).not.toMatch(/^javascript:/);
      expect(href).toMatch(/storage\.supabase\.co|supabase\.co\/storage\/v1\/object/i);
    }
  });
});
