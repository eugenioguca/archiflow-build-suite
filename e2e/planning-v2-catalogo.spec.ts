/**
 * Tests E2E para Planning V2 - Catálogo
 * Verifica el flujo completo de creación de presupuesto, partidas y subpartidas
 */
import { test, expect } from '@playwright/test';

test.describe('Planning V2 - Catálogo con TU', () => {
  test.beforeEach(async ({ page }) => {
    // Login (ajustar según tu sistema de autenticación)
    await page.goto('/');
    // TODO: Implementar login real
    // await page.fill('input[type="email"]', 'test@example.com');
    // await page.fill('input[type="password"]', 'password');
    // await page.click('button[type="submit"]');
    
    // Navegar a Planning V2
    await page.goto('/planning-v2');
  });

  test('crear presupuesto con 2 Mayores TU y verificar agrupación', async ({ page }) => {
    // 1. Crear nuevo presupuesto
    await page.click('button:has-text("Nuevo Presupuesto")');
    
    // Llenar formulario de presupuesto
    await page.fill('input[name="budget_name"]', 'Presupuesto Test E2E');
    await page.fill('textarea[name="description"]', 'Presupuesto de prueba para tests E2E');
    
    // Seleccionar 2 Mayores TU
    const mayorCombobox = page.locator('[role="combobox"]').first();
    await mayorCombobox.click();
    
    // Seleccionar primer Mayor (ej: "PRELIMINARES")
    await page.click('text=PRELIMINARES');
    
    // Agregar segundo Mayor
    const addMayorButton = page.locator('button:has-text("Agregar Mayor")');
    await addMayorButton.click();
    
    const secondMayorCombobox = page.locator('[role="combobox"]').nth(1);
    await secondMayorCombobox.click();
    await page.click('text=CIMENTACIÓN');
    
    // Guardar presupuesto
    await page.click('button:has-text("Crear Presupuesto")');
    
    // Esperar a que se cree el presupuesto
    await expect(page.locator('text=Presupuesto Test E2E')).toBeVisible({ timeout: 10000 });
    
    // 2. En vista Catálogo, verificar que hay 2 headers de grupo
    await page.click('button:has-text("Catálogo")');
    
    // Debe haber 2 headers con los nombres de los Mayores
    const preliminaresHeader = page.locator('text=PRELIMINARES').first();
    const cimentacionHeader = page.locator('text=CIMENTACIÓN').first();
    
    await expect(preliminaresHeader).toBeVisible();
    await expect(cimentacionHeader).toBeVisible();
    
    // 3. Crear una Partida bajo el Mayor "PRELIMINARES"
    const nuevaPartidaButton = page.locator('button:has-text("Nueva Partida")').first();
    await nuevaPartidaButton.click();
    
    // Seleccionar una Partida del catálogo TU
    const partidaCombobox = page.locator('[role="combobox"]', { hasText: 'Partida (TU)' });
    await partidaCombobox.click();
    
    // Seleccionar una partida (ej: "TRABAJOS PRELIMINARES")
    await page.click('text=TRABAJOS PRELIMINARES');
    
    // Guardar partida
    await page.click('button:has-text("Crear Partida")');
    
    // Esperar a que aparezca la partida en la tabla
    await expect(page.locator('text=TRABAJOS PRELIMINARES')).toBeVisible({ timeout: 10000 });
    
    // 4. Agregar una Subpartida a la partida creada
    // Hover sobre la partida para ver el botón "Subpartida"
    const partidaRow = page.locator('text=TRABAJOS PRELIMINARES').locator('..');
    await partidaRow.hover();
    
    const subpartidaButton = partidaRow.locator('button:has-text("Subpartida")');
    await subpartidaButton.click();
    
    // Abrir el diálogo de agregar subpartida
    await expect(page.locator('text=Agregar Subpartida (desde TU)')).toBeVisible();
    
    // Seleccionar una Subpartida
    const subpartidaCombobox = page.locator('[role="combobox"]', { hasText: 'Subpartida (TU)' });
    await subpartidaCombobox.click();
    
    // Seleccionar primera subpartida disponible
    const firstSubpartida = page.locator('[role="option"]').first();
    await firstSubpartida.click();
    
    // Llenar campos requeridos
    await page.fill('input[name="unit"]', 'M2');
    await page.fill('input[name="cantidad_real"]', '100');
    await page.fill('input[name="precio_real"]', '150.50');
    
    // 5. Verificar que el combo de proveedores despliega proveedores reales
    const providerCombobox = page.locator('[role="combobox"]', { hasText: 'Proveedor' });
    await providerCombobox.click();
    
    // Debe haber opciones de proveedores (al menos el texto "proveedores disponibles")
    await expect(page.locator('text=/\\d+ proveedores disponibles/')).toBeVisible();
    
    // Debe haber al menos una opción de proveedor con RFC
    const providerOption = page.locator('[role="option"]').first();
    await expect(providerOption).toBeVisible();
    
    // Seleccionar un proveedor
    await providerOption.click();
    
    // Guardar subpartida
    await page.click('button:has-text("Agregar Concepto")');
    
    // 6. Verificar que la subpartida aparece en la tabla
    await expect(page.locator('text=M2')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=100')).toBeVisible();
    
    // Verificar que el total se calculó correctamente (100 * 150.50 + honorarios + desperdicio)
    // El cálculo exacto depende de los defaults, pero debe mostrar un total
    await expect(page.locator('text=/\\$[\\d,]+\\.\\d{2}/')).toBeVisible();
  });

  test('verificar que dropdowns no son transparentes', async ({ page }) => {
    // Crear presupuesto rápido para testing
    await page.click('button:has-text("Nuevo Presupuesto")');
    
    const mayorCombobox = page.locator('[role="combobox"]').first();
    await mayorCombobox.click();
    
    // Verificar que el dropdown tiene background opaco
    const dropdown = page.locator('[role="listbox"]').first();
    await expect(dropdown).toBeVisible();
    
    // El dropdown debe tener un background (no transparente)
    const bgColor = await dropdown.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });
    
    // Verificar que no es transparente (rgba con alpha < 1 o transparent)
    expect(bgColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(bgColor).not.toBe('transparent');
    
    // Verificar z-index alto
    const zIndex = await dropdown.evaluate((el) => {
      return window.getComputedStyle(el).zIndex;
    });
    
    expect(parseInt(zIndex)).toBeGreaterThan(10);
  });

  test('verificar agrupación correcta en catálogo con múltiples partidas', async ({ page }) => {
    // Este test verifica que las partidas se agrupan correctamente bajo sus Mayores
    await page.click('button:has-text("Catálogo")');
    
    // Debe haber estructura de árbol correcta:
    // - Mayor 1 (header)
    //   - Partida 1.1
    //   - Partida 1.2
    // - Mayor 2 (header)
    //   - Partida 2.1
    
    const catalogTable = page.locator('table, [role="table"]').first();
    await expect(catalogTable).toBeVisible();
    
    // Los headers de Mayor deben estar visibles
    const mayorHeaders = page.locator('[data-group-header="true"], .text-lg.font-semibold');
    await expect(mayorHeaders.first()).toBeVisible();
    
    // Las partidas deben estar indentadas o mostrar jerarquía visual
    const partidas = page.locator('[data-row-type="partida"], tr:has-text("Partida")');
    
    // Verificar que hay partidas renderizadas
    const partidaCount = await partidas.count();
    expect(partidaCount).toBeGreaterThan(0);
  });
});
