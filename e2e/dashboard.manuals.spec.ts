import { test, expect } from '@playwright/test';

test.describe('Dashboard - Manuales de Empresa', () => {
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

  test('Manual de Operación abre en nueva pestaña con URL de Supabase Storage', async ({ page, context }) => {
    // Get the initial page URL to verify it doesn't navigate
    const initialUrl = page.url();
    
    // Wait for the "Expandir" button for operation manual
    const expandButton = page.locator('a[href][target="_blank"]').filter({ hasText: /Expandir.*Operación/i }).first();
    await expect(expandButton).toBeVisible({ timeout: 10000 });
    
    // Click and wait for new page
    const newPagePromise = context.waitForEvent('page');
    await expandButton.click();
    const newPage = await newPagePromise;
    
    // Wait for the new page to load
    await newPage.waitForLoadState('domcontentloaded');
    
    // Verify the new page URL
    const newUrl = newPage.url();
    expect(newUrl).toMatch(/storage\.supabase\.co|supabase\.co\/storage\/v1\/object\/sign/i);
    expect(newUrl).toMatch(/\.pdf(\?|$)/i);
    
    // Verify the main page didn't navigate
    expect(page.url()).toBe(initialUrl);
    
    await newPage.close();
  });

  test('Presentación Corporativa abre en nueva pestaña con URL de Supabase Storage', async ({ page, context }) => {
    // Get the initial page URL to verify it doesn't navigate
    const initialUrl = page.url();
    
    // Wait for the "Expandir" button for presentation manual
    const expandButton = page.locator('a[href][target="_blank"]').filter({ hasText: /Expandir.*Presentación/i }).first();
    await expect(expandButton).toBeVisible({ timeout: 10000 });
    
    // Click and wait for new page
    const newPagePromise = context.waitForEvent('page');
    await expandButton.click();
    const newPage = await newPagePromise;
    
    // Wait for the new page to load
    await newPage.waitForLoadState('domcontentloaded');
    
    // Verify the new page URL
    const newUrl = newPage.url();
    expect(newUrl).toMatch(/storage\.supabase\.co|supabase\.co\/storage\/v1\/object\/sign/i);
    expect(newUrl).toMatch(/\.pdf(\?|$)/i);
    
    // Verify the main page didn't navigate
    expect(page.url()).toBe(initialUrl);
    
    await newPage.close();
  });

  test('Ambos manuales usan enlace directo sin navegación intermedia', async ({ page }) => {
    // Verify both links have direct href (not javascript:void or #)
    const operacionLink = page.locator('a[href][target="_blank"]').filter({ hasText: /Expandir.*Operación/i }).first();
    const presentacionLink = page.locator('a[href][target="_blank"]').filter({ hasText: /Expandir.*Presentación/i }).first();
    
    await expect(operacionLink).toBeVisible({ timeout: 10000 });
    await expect(presentacionLink).toBeVisible({ timeout: 10000 });
    
    // Get href attributes
    const operacionHref = await operacionLink.getAttribute('href');
    const presentacionHref = await presentacionLink.getAttribute('href');
    
    // Verify they're real URLs (not # or javascript:)
    expect(operacionHref).toBeTruthy();
    expect(operacionHref).not.toBe('#');
    expect(operacionHref).not.toMatch(/^javascript:/);
    
    expect(presentacionHref).toBeTruthy();
    expect(presentacionHref).not.toBe('#');
    expect(presentacionHref).not.toMatch(/^javascript:/);
    
    // Verify they point to Supabase Storage
    expect(operacionHref).toMatch(/storage\.supabase\.co|supabase\.co\/storage\/v1\/object\/sign/i);
    expect(presentacionHref).toMatch(/storage\.supabase\.co|supabase\.co\/storage\/v1\/object\/sign/i);
  });
});
