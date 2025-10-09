import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Setup Supabase client for test validation
const supabaseUrl = 'https://ycbflvptfgrjclzzlxci.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljYmZsdnB0ZmdyamNsenpseGNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4MDI1OTAsImV4cCI6MjA3NTM3ODU5MH0.afYhVKXUaRQFcarfIt2gQUg7oH_oUxLq_yZlqAyDXjY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

test.describe('Calendar - Debug Notification Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login with test credentials
    await page.goto('/login');
    await page.fill('input[type="email"]', 'eugenioguca@hotmail.com');
    await page.fill('input[type="password"]', 'your-test-password');
    await page.click('button[type="submit"]');
    
    // Wait for navigation to dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
  });

  /**
   * Test objetivo: Validar flujo completo Debug → Notificación
   * 
   * Acciones:
   * 1. Navegar al Calendario
   * 2. Click en botón Debug
   * 3. Esperar confirmación de notificación de prueba
   * 4. Validar en DB que status='sent' y sent_at está seteado
   * 5. Validar que no hay errores en el registro
   * 
   * Criterio de éxito:
   * - El reminder se marca como 'sent' en menos de 90 segundos
   * - sent_at tiene un valor (timestamp)
   * - error es null
   */
  test('flujo completo debug → notificación enviada', async ({ page }) => {
    console.log('🧪 Starting debug notification flow test');

    // 1. Navigate to Calendar
    await page.goto('/calendar');
    await page.waitForLoadState('networkidle');
    console.log('✅ Navigated to calendar');

    // 2. Click Debug button
    const debugButton = page.locator('button:has-text("Debug")');
    await expect(debugButton).toBeVisible();
    await debugButton.click();
    console.log('✅ Clicked Debug button');

    // 3. Wait for debug panel to appear
    await page.waitForSelector('text=Panel de Debug del Calendario', { timeout: 5000 });
    console.log('✅ Debug panel visible');

    // 4. Click "Crear Evento de Prueba" button
    const createTestButton = page.locator('button:has-text("Crear Evento de Prueba")');
    await expect(createTestButton).toBeVisible();
    
    // Get timestamp before creating event
    const testStartTime = new Date().toISOString();
    
    await createTestButton.click();
    console.log('✅ Clicked create test event button');

    // 5. Wait for success toast
    await page.waitForSelector('text=Notificación de prueba enviada', { timeout: 10000 });
    console.log('✅ Success toast appeared');

    // 6. Query database for the reminder that was just created
    // We'll look for reminders created after our test started and marked as 'sent'
    console.log('🔍 Querying database for sent reminder...');
    
    let reminderFound = false;
    let attempts = 0;
    const maxAttempts = 18; // 90 seconds / 5 seconds per attempt
    
    while (!reminderFound && attempts < maxAttempts) {
      attempts++;
      
      // Query for event_alerts that are sent and created recently
      const { data: reminders, error } = await supabase
        .from('event_alerts')
        .select('id, status, sent_at, error, created_at')
        .eq('status', 'sent')
        .gte('created_at', testStartTime)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('❌ Database query error:', error);
        throw new Error(`Failed to query reminders: ${error.message}`);
      }

      if (reminders && reminders.length > 0) {
        // Found at least one sent reminder
        const reminder = reminders[0];
        console.log('✅ Found sent reminder:', reminder);
        
        // Validate reminder data
        expect(reminder.status).toBe('sent');
        expect(reminder.sent_at).not.toBeNull();
        expect(reminder.sent_at).toBeTruthy();
        expect(reminder.error).toBeNull();
        
        reminderFound = true;
        console.log('✅ Reminder validation passed');
      } else {
        console.log(`⏳ Attempt ${attempts}/${maxAttempts}: No sent reminder found yet, waiting...`);
        await page.waitForTimeout(5000); // Wait 5 seconds before next attempt
      }
    }

    // Final validation
    if (!reminderFound) {
      // Query all reminders to see what we have
      const { data: allReminders } = await supabase
        .from('event_alerts')
        .select('id, status, sent_at, error, created_at')
        .gte('created_at', testStartTime)
        .order('created_at', { ascending: false });
      
      console.error('❌ Reminders found:', JSON.stringify(allReminders, null, 2));
      throw new Error('Reminder was not marked as sent within 90 seconds timeout');
    }

    console.log('✅ Test completed successfully');
  });

  /**
   * Test adicional: Validar que el permiso de notificaciones se solicita
   */
  test('solicita permiso de notificaciones al abrir debug', async ({ page, context }) => {
    // Grant notification permissions before the test
    await context.grantPermissions(['notifications']);

    // Navigate to Calendar
    await page.goto('/calendar');
    await page.waitForLoadState('networkidle');

    // Click Debug button
    const debugButton = page.locator('button:has-text("Debug")');
    await expect(debugButton).toBeVisible();
    await debugButton.click();

    // Verify notification setup toast appears
    // This should appear because ensurePushSubscription runs on debug click
    await page.waitForSelector('text=Push Notifications', { timeout: 10000 });
    console.log('✅ Push notification setup initiated');
  });

  /**
   * Test de validación: Verificar logs en consola
   */
  test('logs de observabilidad aparecen en consola', async ({ page }) => {
    const consoleLogs: string[] = [];
    
    // Capture console logs
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push(text);
      console.log('📋 Console:', text);
    });

    // Navigate to Calendar
    await page.goto('/calendar');
    await page.waitForLoadState('networkidle');

    // Click Debug button
    const debugButton = page.locator('button:has-text("Debug")');
    await debugButton.click();

    // Wait for debug panel
    await page.waitForSelector('text=Panel de Debug del Calendario');

    // Click create test event
    const createTestButton = page.locator('button:has-text("Crear Evento de Prueba")');
    await createTestButton.click();

    // Wait a bit for logs to accumulate
    await page.waitForTimeout(3000);

    // Verify key observability logs are present
    const hasDebugLogs = consoleLogs.some(log => 
      log.includes('DEBUG - Recordatorio programado') ||
      log.includes('Triggering immediate dispatch')
    );

    expect(hasDebugLogs).toBe(true);
    console.log('✅ Observability logs found in console');
  });
});
