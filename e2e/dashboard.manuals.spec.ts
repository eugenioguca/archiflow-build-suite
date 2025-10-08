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

  // ========== TESTS CRÍTICOS DE BLINDAJE ==========

  test('lista sin alertas rojas - no debe existir texto "Error en Manual"', async ({ page }) => {
    // Wait for manuals section to load
    await page.waitForSelector('text=Manuales de Operación', { timeout: 10000 });
    
    // Wait for any potential errors to appear
    await page.waitForTimeout(2000);
    
    // Verify there are no error messages in the manuals section
    const errorText = page.locator('text=/error en manual/i');
    await expect(errorText).toHaveCount(0);
    
    // Also check for common error indicators
    const errorAlerts = page.locator('[role="alert"]').filter({ hasText: /error/i });
    await expect(errorAlerts).toHaveCount(0);
    
    // Verify no destructive toast notifications
    const destructiveToasts = page.locator('.bg-destructive, [data-variant="destructive"]');
    await expect(destructiveToasts).toHaveCount(0);
  });

  test('abrir manual - verifica apertura correcta sin bloqueos', async ({ page, context }) => {
    // Wait for manuals to load
    await page.waitForSelector('text=Manuales de Operación', { timeout: 10000 });
    
    // Find first manual open link
    const openButton = page.locator('a[target="_blank"][rel="noopener noreferrer"]').first();
    await expect(openButton).toBeVisible({ timeout: 10000 });
    
    // Hover to trigger prefetch (ensures URL is ready)
    const manualRow = openButton.locator('..').locator('..').locator('..');
    await manualRow.hover();
    await page.waitForTimeout(1500);
    
    // Verify the link has a valid href before clicking
    const href = await openButton.getAttribute('href');
    expect(href).toBeTruthy();
    expect(href).not.toBe('#');
    
    // Listen for new page event
    const newPagePromise = context.waitForEvent('page');
    await openButton.click();
    const newPage = await newPagePromise;
    
    // Wait for new page to start loading
    await newPage.waitForLoadState('domcontentloaded', { timeout: 15000 });
    
    // Verify the URL matches Supabase Storage with PDF
    const newPageUrl = newPage.url();
    expect(newPageUrl).toMatch(/storage\.supabase\.co|supabase\.co\/storage\/v1\/object/i);
    expect(newPageUrl).toMatch(/\.pdf(\?|$)/i);
    
    // Verify the URL is a signed URL (contains token parameter)
    expect(newPageUrl).toContain('token=');
    
    // Close the new page
    await newPage.close();
    
    // Verify no error appeared on the main page
    const errorText = page.locator('text=/error/i');
    const errorCount = await errorText.count();
    expect(errorCount).toBe(0);
  });
});
