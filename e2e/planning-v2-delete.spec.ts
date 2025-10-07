/**
 * Tests E2E para Planning V2 - Delete Budget
 * Verifica que el borrado de presupuestos no congela la UI
 */
import { test, expect, type Page } from '@playwright/test';

test.describe('Planning V2 - Delete Budget (No Freeze)', () => {
  test.beforeEach(async ({ page }) => {
    // Login (ajustar según tu sistema de autenticación real)
    await page.goto('/');
    // TODO: Implementar login real si es necesario
    // await page.fill('input[type="email"]', 'test@example.com');
    // await page.fill('input[type="password"]', 'password');
    // await page.click('button[type="submit"]');
    
    // Navegar a Planning V2
    await page.goto('/planning-v2');
  });

  /**
   * Helper: Crear un presupuesto de prueba
   */
  async function createTestBudget(page: Page, name: string) {
    // Abrir wizard
    await page.click('button:has-text("Nuevo presupuesto")');
    await page.waitForSelector('text=Nuevo presupuesto', { timeout: 5000 });
    
    // Llenar datos básicos
    await page.fill('input[name="budget_name"]', name);
    await page.fill('textarea[name="description"]', `Presupuesto de prueba E2E: ${name}`);
    
    // Guardar (asumiendo que hay un botón "Crear" o "Guardar")
    await page.click('button:has-text("Crear")');
    
    // Esperar a que aparezca en la lista
    await expect(page.locator(`text=${name}`)).toBeVisible({ timeout: 10000 });
  }

  /**
   * Escenario 1: Eliminación exitosa
   * - Debe navegar a /planning-v2
   * - La UI debe seguir siendo usable
   * - No debe haber overlays ni bloqueos
   */
  test('eliminar presupuesto exitosamente sin congelar UI', async ({ page }) => {
    // 1. Crear un presupuesto de prueba
    const budgetName = `E2E Delete Test ${Date.now()}`;
    await createTestBudget(page, budgetName);
    
    // 2. Mover el presupuesto a la papelera primero
    const budgetRow = page.locator(`text=${budgetName}`).locator('..').locator('..');
    
    // Abrir menú de acciones (MoreVertical button)
    const actionsMenu = budgetRow.locator('button[aria-label="Acciones"], button:has-text("⋮")').first();
    await actionsMenu.click();
    
    // Click en "Mover a papelera"
    await page.click('text=Mover a papelera');
    
    // Confirmar en el diálogo
    await expect(page.locator('text=/Mover a papelera/')).toBeVisible({ timeout: 3000 });
    await page.click('button:has-text("Mover a papelera")');
    
    // Esperar a que desaparezca de la lista activa
    await expect(page.locator(`text=${budgetName}`)).not.toBeVisible({ timeout: 5000 });
    
    // 3. Ir a la papelera
    await page.click('button:has-text("Papelera")');
    await expect(page.locator('text=Papelera')).toBeVisible();
    
    // 4. Eliminar permanentemente
    const trashedRow = page.locator(`text=${budgetName}`).locator('..').locator('..');
    const trashedActionsMenu = trashedRow.locator('button[aria-label="Acciones"], button:has-text("⋮")').first();
    await trashedActionsMenu.click();
    
    await page.click('text=Eliminar permanentemente');
    
    // Confirmar eliminación permanente
    await expect(page.locator('text=/Eliminar permanentemente/')).toBeVisible({ timeout: 3000 });
    
    // Verificar que NO hay overlays bloqueando antes de confirmar
    const overlaysBefore = await page.locator('[data-radix-dialog-overlay], [data-radix-alert-dialog-overlay]').count();
    expect(overlaysBefore).toBeGreaterThanOrEqual(1); // El diálogo debe estar abierto
    
    await page.click('button:has-text("Eliminar definitivamente")');
    
    // 5. Verificar que redirige a /planning-v2 y la UI responde
    await page.waitForURL('/planning-v2', { timeout: 5000 });
    
    // 6. Verificar que NO hay overlays ni elementos bloqueando
    await page.waitForTimeout(500); // Esperar a que se limpien overlays
    
    const overlaysAfter = await page.locator('[data-radix-dialog-overlay][data-state="open"], [data-radix-alert-dialog-overlay][data-state="open"]').count();
    expect(overlaysAfter).toBe(0);
    
    // Verificar que body no tiene clase de scroll lock
    const bodyClasses = await page.locator('body').getAttribute('class') || '';
    expect(bodyClasses).not.toContain('overflow-hidden');
    
    // 7. Verificar que la UI sigue usable: se puede abrir otro presupuesto o wizard
    const newBudgetButton = page.locator('button:has-text("Nuevo presupuesto")');
    await expect(newBudgetButton).toBeVisible();
    await expect(newBudgetButton).toBeEnabled();
    
    // Click en el botón para verificar que responde
    await newBudgetButton.click({ timeout: 3000 });
    await expect(page.locator('text=Nuevo presupuesto')).toBeVisible({ timeout: 5000 });
    
    // Cerrar wizard (si se abrió)
    const cancelButton = page.locator('button:has-text("Cancelar")').first();
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
    }
    
    console.log('✅ Escenario exitoso: UI responde correctamente después de eliminar');
  });

  /**
   * Escenario 2: Error simulado
   * - Interceptar RPC y forzar error
   * - Debe aparecer toast de error
   * - La UI debe seguir siendo usable
   * - No debe haber overlays ni bloqueos
   */
  test('error al eliminar presupuesto no congela UI', async ({ page }) => {
    // 1. Crear un presupuesto de prueba
    const budgetName = `E2E Delete Error Test ${Date.now()}`;
    await createTestBudget(page, budgetName);
    
    // 2. Moverlo a papelera
    const budgetRow = page.locator(`text=${budgetName}`).locator('..').locator('..');
    const actionsMenu = budgetRow.locator('button[aria-label="Acciones"], button:has-text("⋮")').first();
    await actionsMenu.click();
    await page.click('text=Mover a papelera');
    await page.click('button:has-text("Mover a papelera")');
    await expect(page.locator(`text=${budgetName}`)).not.toBeVisible({ timeout: 5000 });
    
    // 3. Ir a papelera
    await page.click('button:has-text("Papelera")');
    
    // 4. Interceptar la llamada al RPC y forzar error
    await page.route('**/rest/v1/rpc/planning_v2_delete_budget', route => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Error simulado: no se pudo eliminar el presupuesto',
          code: 'SIMULATED_ERROR'
        })
      });
    });
    
    // 5. Intentar eliminar permanentemente
    const trashedRow = page.locator(`text=${budgetName}`).locator('..').locator('..');
    const trashedActionsMenu = trashedRow.locator('button[aria-label="Acciones"], button:has-text("⋮")').first();
    await trashedActionsMenu.click();
    await page.click('text=Eliminar permanentemente');
    await page.click('button:has-text("Eliminar definitivamente")');
    
    // 6. Verificar que aparece un toast de error (usando sonner)
    await expect(page.locator('text=/No se pudo eliminar|error/i')).toBeVisible({ timeout: 5000 });
    
    // 7. Verificar que NO hay overlays bloqueando después del error
    await page.waitForTimeout(500);
    
    const overlaysAfter = await page.locator('[data-radix-dialog-overlay][data-state="open"], [data-radix-alert-dialog-overlay][data-state="open"]').count();
    expect(overlaysAfter).toBe(0);
    
    // Verificar que body no tiene clase de scroll lock
    const bodyClasses = await page.locator('body').getAttribute('class') || '';
    expect(bodyClasses).not.toContain('overflow-hidden');
    
    // Verificar que no hay pointer-events bloqueando
    const bodyStyle = await page.locator('body').getAttribute('style') || '';
    expect(bodyStyle).not.toContain('pointer-events: none');
    
    // 8. Verificar que la UI sigue usable
    const verPresupuestosButton = page.locator('button:has-text("Ver presupuestos")');
    await expect(verPresupuestosButton).toBeVisible();
    await expect(verPresupuestosButton).toBeEnabled();
    
    // Click para verificar que responde
    await verPresupuestosButton.click({ timeout: 3000 });
    await page.waitForURL('/planning-v2', { timeout: 5000 });
    
    // Verificar que se puede interactuar con la lista
    const newBudgetButton = page.locator('button:has-text("Nuevo presupuesto")');
    await expect(newBudgetButton).toBeVisible();
    await expect(newBudgetButton).toBeEnabled();
    
    console.log('✅ Escenario de error: UI responde correctamente después del error');
  });

  /**
   * Escenario 3: Cancelación del diálogo
   * - Abrir diálogo de confirmación
   * - Cancelar sin ejecutar
   * - La UI debe responder sin bloqueos
   */
  test('cancelar eliminación no congela UI', async ({ page }) => {
    // 1. Crear un presupuesto de prueba
    const budgetName = `E2E Delete Cancel Test ${Date.now()}`;
    await createTestBudget(page, budgetName);
    
    // 2. Moverlo a papelera
    const budgetRow = page.locator(`text=${budgetName}`).locator('..').locator('..');
    const actionsMenu = budgetRow.locator('button[aria-label="Acciones"], button:has-text("⋮")').first();
    await actionsMenu.click();
    await page.click('text=Mover a papelera');
    await page.click('button:has-text("Mover a papelera")');
    await expect(page.locator(`text=${budgetName}`)).not.toBeVisible({ timeout: 5000 });
    
    // 3. Ir a papelera
    await page.click('button:has-text("Papelera")');
    
    // 4. Abrir diálogo de eliminación permanente
    const trashedRow = page.locator(`text=${budgetName}`).locator('..').locator('..');
    const trashedActionsMenu = trashedRow.locator('button[aria-label="Acciones"], button:has-text("⋮")').first();
    await trashedActionsMenu.click();
    await page.click('text=Eliminar permanentemente');
    
    // Verificar que el diálogo está abierto
    await expect(page.locator('text=/Eliminar permanentemente/')).toBeVisible({ timeout: 3000 });
    
    // 5. Cancelar
    await page.click('button:has-text("Cancelar")');
    
    // 6. Verificar que NO hay overlays bloqueando
    await page.waitForTimeout(300);
    
    const overlaysAfter = await page.locator('[data-radix-dialog-overlay][data-state="open"], [data-radix-alert-dialog-overlay][data-state="open"]').count();
    expect(overlaysAfter).toBe(0);
    
    // Verificar limpieza de body
    const bodyClasses = await page.locator('body').getAttribute('class') || '';
    expect(bodyClasses).not.toContain('overflow-hidden');
    
    // 7. Verificar que la UI responde
    const verPresupuestosButton = page.locator('button:has-text("Ver presupuestos")');
    await expect(verPresupuestosButton).toBeEnabled();
    
    console.log('✅ Escenario de cancelación: UI responde correctamente');
  });

  /**
   * Escenario 4: Presionar ESC para cerrar
   * - Abrir diálogo
   * - Presionar ESC
   * - Verificar limpieza correcta
   */
  test('cerrar diálogo con ESC no congela UI', async ({ page }) => {
    // 1. Crear un presupuesto de prueba
    const budgetName = `E2E Delete ESC Test ${Date.now()}`;
    await createTestBudget(page, budgetName);
    
    // 2. Moverlo a papelera y abrir diálogo
    const budgetRow = page.locator(`text=${budgetName}`).locator('..').locator('..');
    const actionsMenu = budgetRow.locator('button[aria-label="Acciones"], button:has-text("⋮")').first();
    await actionsMenu.click();
    await page.click('text=Mover a papelera');
    await page.click('button:has-text("Mover a papelera")');
    await expect(page.locator(`text=${budgetName}`)).not.toBeVisible({ timeout: 5000 });
    
    await page.click('button:has-text("Papelera")');
    
    const trashedRow = page.locator(`text=${budgetName}`).locator('..').locator('..');
    const trashedActionsMenu = trashedRow.locator('button[aria-label="Acciones"], button:has-text("⋮")').first();
    await trashedActionsMenu.click();
    await page.click('text=Eliminar permanentemente');
    
    await expect(page.locator('text=/Eliminar permanentemente/')).toBeVisible({ timeout: 3000 });
    
    // 3. Presionar ESC
    await page.keyboard.press('Escape');
    
    // 4. Verificar limpieza
    await page.waitForTimeout(300);
    
    const overlaysAfter = await page.locator('[data-radix-dialog-overlay][data-state="open"], [data-radix-alert-dialog-overlay][data-state="open"]').count();
    expect(overlaysAfter).toBe(0);
    
    const bodyClasses = await page.locator('body').getAttribute('class') || '';
    expect(bodyClasses).not.toContain('overflow-hidden');
    
    // 5. Verificar UI usable
    const verPresupuestosButton = page.locator('button:has-text("Ver presupuestos")');
    await expect(verPresupuestosButton).toBeEnabled();
    
    console.log('✅ Escenario ESC: UI responde correctamente');
  });
});
