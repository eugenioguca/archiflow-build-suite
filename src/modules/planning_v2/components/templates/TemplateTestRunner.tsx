/**
 * TemplateTestRunner - Planning v2
 * Componente para ejecutar y visualizar tests de plantilla
 */

import { useState } from 'react';
import { Play, CheckCircle2, XCircle, AlertCircle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useTemplateTests } from '../../hooks/useTemplateTests';
import type { TestRunResult } from '../../types';

interface TemplateTestRunnerProps {
  templateId: string;
}

export function TemplateTestRunner({ templateId }: TemplateTestRunnerProps) {
  const {
    tests,
    isLoading,
    runTest,
    runAllTests,
    isRunningTest,
    isRunningAllTests
  } = useTemplateTests(templateId);

  const [testResults, setTestResults] = useState<TestRunResult[]>([]);

  const handleRunTest = async (testId: string) => {
    const result = await runTest(testId);
    setTestResults((prev) => {
      const filtered = prev.filter((r) => r.test_id !== testId);
      return [...filtered, result];
    });
  };

  const handleRunAllTests = async () => {
    const results = await runAllTests();
    setTestResults(results);
  };

  if (isLoading) {
    return <div>Cargando pruebas...</div>;
  }

  if (!tests || tests.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Sin pruebas</h3>
          <p className="text-muted-foreground mb-4 text-center">
            Crea pruebas para validar el cálculo de tu plantilla
          </p>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Crear Prueba
          </Button>
        </CardContent>
      </Card>
    );
  }

  const passedTests = tests.filter((t) => t.last_run_status === 'passed').length;
  const totalTests = tests.length;
  const passRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Resumen de Pruebas</CardTitle>
            <Button
              onClick={handleRunAllTests}
              disabled={isRunningAllTests}
            >
              <Play className="mr-2 h-4 w-4" />
              {isRunningAllTests ? 'Ejecutando...' : 'Ejecutar Todas'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Tasa de éxito</span>
              <span className="font-semibold">
                {passedTests}/{totalTests} ({passRate.toFixed(0)}%)
              </span>
            </div>
            <Progress value={passRate} />
          </div>
        </CardContent>
      </Card>

      {/* Test List */}
      <div className="space-y-3">
        {tests.map((test) => {
          const result = testResults.find((r) => r.test_id === test.id);
          const status = result?.passed ?? (test.last_run_status === 'passed');

          return (
            <Card key={test.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold">{test.test_name}</h4>
                      {test.last_run_status && (
                        <Badge
                          variant={
                            test.last_run_status === 'passed'
                              ? 'default'
                              : test.last_run_status === 'failed'
                              ? 'destructive'
                              : 'secondary'
                          }
                        >
                          {test.last_run_status === 'passed' && (
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                          )}
                          {test.last_run_status === 'failed' && (
                            <XCircle className="mr-1 h-3 w-3" />
                          )}
                          {test.last_run_status === 'passed'
                            ? 'Pasó'
                            : test.last_run_status === 'failed'
                            ? 'Falló'
                            : 'Sin ejecutar'}
                        </Badge>
                      )}
                    </div>

                    <div className="text-sm space-y-1">
                      <div className="flex items-center gap-4">
                        <span className="text-muted-foreground">
                          Total esperado:
                        </span>
                        <span className="font-mono">
                          ${test.expected_grand_total.toFixed(2)}
                        </span>
                      </div>

                      {result && (
                        <>
                          <div className="flex items-center gap-4">
                            <span className="text-muted-foreground">
                              Total obtenido:
                            </span>
                            <span className="font-mono">
                              ${result.actual_grand_total.toFixed(2)}
                            </span>
                          </div>
                          {!result.passed && (
                            <div className="flex items-center gap-4 text-destructive">
                              <span>Diferencia:</span>
                              <span className="font-mono">
                                ${Math.abs(result.difference).toFixed(2)}
                              </span>
                            </div>
                          )}
                        </>
                      )}

                      {test.last_run_error && (
                        <div className="text-xs text-destructive mt-2">
                          {test.last_run_error}
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRunTest(test.id)}
                    disabled={isRunningTest}
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
