/**
 * Template Test Service - Planning v2
 * 
 * Execute and manage template tests
 */

import { supabase } from '@/integrations/supabase/client';
import type { PlanningTemplateTest, TestRunResult } from '../types';
import Decimal from 'decimal.js';

// ==================== CRUD Operations ====================

export async function getTemplateTests(templateId: string) {
  const { data, error } = await supabase
    .from('planning_template_tests')
    .select('*')
    .eq('template_id', templateId)
    .order('created_at');
  
  if (error) throw error;
  return data as PlanningTemplateTest[];
}

export async function createTemplateTest(test: {
  template_id: string;
  test_name: string;
  test_inputs: any[];
  expected_grand_total: number;
  expected_outputs?: Record<string, any>;
}) {
  const { data, error } = await supabase
    .from('planning_template_tests')
    .insert(test)
    .select()
    .single();
  
  if (error) throw error;
  return data as PlanningTemplateTest;
}

export async function updateTemplateTest(
  testId: string,
  updates: Partial<PlanningTemplateTest>
) {
  const { data, error } = await supabase
    .from('planning_template_tests')
    .update(updates)
    .eq('id', testId)
    .select()
    .single();
  
  if (error) throw error;
  return data as PlanningTemplateTest;
}

export async function deleteTemplateTest(testId: string) {
  const { error } = await supabase
    .from('planning_template_tests')
    .delete()
    .eq('id', testId);
  
  if (error) throw error;
}

// ==================== Test Execution ====================

/**
 * Execute a single test and validate results
 */
export async function runTemplateTest(
  testId: string
): Promise<TestRunResult> {
  const { data: test, error } = await supabase
    .from('planning_template_tests')
    .select('*')
    .eq('id', testId)
    .single();

  if (error || !test) {
    throw new Error('Test no encontrado');
  }

  try {
    // Calculate grand total from test inputs
    // This is a simplified calculation - in production you'd use the full formula engine
    let actualGrandTotal = new Decimal(0);
    
    // Parse test inputs as array
    const inputs = Array.isArray(test.test_inputs) 
      ? test.test_inputs 
      : [test.test_inputs];
    
    for (const input of inputs) {
      // Type guard for input object
      if (typeof input !== 'object' || input === null) continue;
      
      const inputData = input as Record<string, any>;
      const cantidadReal = new Decimal(inputData.cantidad_real || 0);
      const desperdicioPct = new Decimal(inputData.desperdicio_pct || 0);
      const precioReal = new Decimal(inputData.precio_real || 0);
      const honorariosPct = new Decimal(inputData.honorarios_pct || 0);

      // cantidad = cantidad_real * (1 + desperdicio_pct/100)
      const cantidad = cantidadReal.times(
        new Decimal(1).plus(desperdicioPct.div(100))
      );

      // pu = precio_real * (1 + honorarios_pct/100)
      const pu = precioReal.times(
        new Decimal(1).plus(honorariosPct.div(100))
      );

      // total = cantidad * pu
      const total = cantidad.times(pu);

      if (inputData.sumable !== false) {
        actualGrandTotal = actualGrandTotal.plus(total);
      }
    }

    const expectedTotal = new Decimal(test.expected_grand_total);
    const difference = actualGrandTotal.minus(expectedTotal);
    const tolerance = new Decimal(0.01); // 1 centavo de tolerancia
    const passed = difference.abs().lessThanOrEqualTo(tolerance);

    const result: TestRunResult = {
      test_id: test.id,
      test_name: test.test_name,
      passed,
      actual_grand_total: actualGrandTotal.toNumber(),
      expected_grand_total: test.expected_grand_total,
      difference: difference.toNumber()
    };

    // Update test run status
    await supabase
      .from('planning_template_tests')
      .update({
        last_run_status: passed ? 'passed' : 'failed',
        last_run_at: new Date().toISOString(),
        last_run_error: passed ? null : `Diferencia: ${difference.toFixed(2)}`
      })
      .eq('id', testId);

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    
    // Update test run status with error
    await supabase
      .from('planning_template_tests')
      .update({
        last_run_status: 'failed',
        last_run_at: new Date().toISOString(),
        last_run_error: errorMessage
      })
      .eq('id', testId);

    return {
      test_id: testId,
      test_name: test.test_name,
      passed: false,
      actual_grand_total: 0,
      expected_grand_total: test.expected_grand_total,
      difference: test.expected_grand_total,
      error: errorMessage
    };
  }
}

/**
 * Execute all tests for a template
 */
export async function runAllTemplateTests(
  templateId: string
): Promise<TestRunResult[]> {
  const tests = await getTemplateTests(templateId);
  const results: TestRunResult[] = [];

  for (const test of tests) {
    const result = await runTemplateTest(test.id);
    results.push(result);
  }

  return results;
}

/**
 * Check if all tests are passing for a template
 */
export async function validateTemplateTests(
  templateId: string
): Promise<{ allPassed: boolean; results: TestRunResult[] }> {
  const results = await runAllTemplateTests(templateId);
  const allPassed = results.every(r => r.passed);

  return { allPassed, results };
}
