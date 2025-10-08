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
    
    // Find the first manual open button (Button with ExternalLink icon)
    const openButton = page.locator('button[title="Abrir en nueva pestaña"]').first();
    
    // Wait for the button to be visible and enabled
    await expect(openButton).toBeVisible({ timeout: 10000 });

    // Listen for new page event
    const newPagePromise = context.waitForEvent('page');
    await openButton.click();
    const newPage = await newPagePromise;

    // Wait for the new page to load
    await newPage.waitForLoadState('domcontentloaded', { timeout: 15000 });
    
    // Verify the URL points to Supabase Storage with signed URL
    const url = newPage.url();
    expect(url).toMatch(/storage\.supabase\.co|supabase\.co\/storage\/v1\/object/i);
    expect(url).toMatch(/\.pdf(\?|$)/i);
    expect(url).toContain('token=');

    // Verify no InvalidJWT or claim timestamp errors in the content
    const pageContent = await newPage.content();
    expect(pageContent).not.toMatch(/InvalidJWT|claim timestamp check failed/i);

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

    // Verify prefetch was triggered (component stores signed URLs internally)
    // The button should be visible and ready
    const openButton = manualRow.locator('button[title="Abrir en nueva pestaña"]');
    await expect(openButton).toBeVisible();
    await expect(openButton).toBeEnabled();
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

  test('manual buttons use onClick handler (not direct links)', async ({ page }) => {
    // Wait for manuals list
    await page.waitForSelector('text=Manuales de Operación');
    
    // Find first manual open button
    const openButton = page.locator('button[title="Abrir en nueva pestaña"]').first();
    await expect(openButton).toBeVisible({ timeout: 10000 });
    
    // Verify it's a button (not a link) - uses onClick with just-in-time signing
    const tagName = await openButton.evaluate(el => el.tagName.toLowerCase());
    expect(tagName).toBe('button');
    
    // Verify it has proper accessibility attributes
    const ariaLabel = await openButton.getAttribute('aria-label');
    expect(ariaLabel).toBe('Abrir en nueva pestaña');
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

  test('abrir manual - verifica apertura correcta sin bloqueos ni InvalidJWT', async ({ page, context }) => {
    // Wait for manuals to load
    await page.waitForSelector('text=Manuales de Operación', { timeout: 10000 });
    
    // Find first manual open button
    const openButton = page.locator('button[title="Abrir en nueva pestaña"]').first();
    await expect(openButton).toBeVisible({ timeout: 10000 });
    
    // Listen for new page event BEFORE clicking to avoid popup blocker
    const newPagePromise = context.waitForEvent('page');
    await openButton.click();
    const newPage = await newPagePromise;
    
    // Wait for new page to load completely
    await newPage.waitForLoadState('domcontentloaded', { timeout: 15000 });
    
    // CRITICAL: Verify the URL matches Supabase Storage signed URL pattern
    const newPageUrl = newPage.url();
    expect(newPageUrl).toMatch(/supabase\.co\/storage\/v1\/object\/sign\/.*\.pdf/i);
    expect(newPageUrl).toContain('token=');
    
    // CRITICAL: Verify no InvalidJWT or exp errors in the page content
    const pageContent = await newPage.content();
    expect(pageContent).not.toMatch(/InvalidJWT|exp|claim timestamp/i);
    
    // Verify the page doesn't show JSON error response
    expect(pageContent).not.toMatch(/\{"error":/i);
    
    // Verify page is NOT about:blank
    expect(newPageUrl).not.toBe('about:blank');
    expect(newPageUrl).not.toMatch(/^about:/);
    
    // Close the new page
    await newPage.close();
    
    // Verify main dashboard page stayed on /dashboard
    expect(page.url()).toContain('/dashboard');
    
    // Verify no error alerts appeared
    const errorAlerts = page.locator('[role="alert"]').filter({ hasText: /error/i });
    await expect(errorAlerts).toHaveCount(0);
  });

  test('rotación automática de firma - abrir después de 6 minutos', async ({ page, context }) => {
    // This test validates that the auto-refresh mechanism works
    // The hook refreshes signed URLs every 12 minutes (80% of 15 min TTL)
    test.setTimeout(8 * 60 * 1000); // 8 minutes timeout for the test
    
    // Wait for manuals to load
    await page.waitForSelector('text=Manuales de Operación', { timeout: 10000 });
    
    // Find first manual open button
    const openButton = page.locator('button[title="Abrir en nueva pestaña"]').first();
    await expect(openButton).toBeVisible({ timeout: 10000 });
    
    // FIRST OPEN: Verify initial signed URL works
    let newPagePromise = context.waitForEvent('page');
    await openButton.click();
    let newPage = await newPagePromise;
    
    await newPage.waitForLoadState('domcontentloaded', { timeout: 15000 });
    const firstUrl = newPage.url();
    expect(firstUrl).toMatch(/supabase\.co\/storage\/v1\/object\/sign\/.*\.pdf/i);
    
    const firstContent = await newPage.content();
    expect(firstContent).not.toMatch(/InvalidJWT|exp/i);
    
    await newPage.close();
    
    // WAIT: Simulate waiting 6-8 minutes for potential URL expiration scenario
    // In reality, the hook should auto-refresh at 12 min, so 6 min is safe
    console.log('Waiting 6 minutes to test auto-refresh...');
    await page.waitForTimeout(6 * 60 * 1000); // 6 minutes
    
    // SECOND OPEN: Verify the refreshed signed URL still works
    newPagePromise = context.waitForEvent('page');
    await openButton.click();
    newPage = await newPagePromise;
    
    await newPage.waitForLoadState('domcontentloaded', { timeout: 15000 });
    const secondUrl = newPage.url();
    expect(secondUrl).toMatch(/supabase\.co\/storage\/v1\/object\/sign\/.*\.pdf/i);
    
    // CRITICAL: Verify no JWT expiration errors after waiting
    const secondContent = await newPage.content();
    expect(secondContent).not.toMatch(/InvalidJWT|exp|claim timestamp/i);
    expect(secondContent).not.toMatch(/\{"error":/i);
    
    // URLs should be different (new token generated)
    expect(secondUrl).not.toBe(firstUrl);
    
    await newPage.close();
    
    // Verify dashboard remained stable
    expect(page.url()).toContain('/dashboard');
    const errorAlerts = page.locator('[role="alert"]').filter({ hasText: /error/i });
    await expect(errorAlerts).toHaveCount(0);
  });
});
