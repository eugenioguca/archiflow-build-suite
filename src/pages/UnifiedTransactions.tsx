import { useState } from 'react';
import { UnifiedFinancialTransactions } from "@/components/UnifiedFinancialTransactions";
import { TestCombobox } from '@/components/TestCombobox';
import { UnifiedTransactionForm } from '@/components/UnifiedTransactionForm';
import { UnifiedTransactionBulkForm } from '@/components/UnifiedTransactionBulkForm';
import { Button } from '@/components/ui/button';

export default function UnifiedTransactions() {
  const [showTest, setShowTest] = useState(false);
  const [showTestForm, setShowTestForm] = useState(false);
  const [showBulkForm, setShowBulkForm] = useState(false);

  // Modo de prueba del combobox aislado
  if (showTest) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="mb-4">
          <Button 
            onClick={() => setShowTest(false)}
            variant="outline"
          >
            ← Volver a Transacciones
          </Button>
        </div>
        <TestCombobox />
      </div>
    );
  }

  // Modo de prueba del formulario
  if (showTestForm) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="mb-4">
          <Button 
            onClick={() => setShowTestForm(false)}
            variant="outline"
          >
            ← Volver a Transacciones
          </Button>
        </div>
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="p-6 border rounded-lg bg-card">
            <h2 className="text-xl font-semibold mb-4">Test Formulario de Transacciones</h2>
            <Button 
              onClick={() => setShowTestForm(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              🔧 Abrir Formulario
            </Button>
          </div>
        </div>
        <UnifiedTransactionForm 
          open={true}
          onOpenChange={() => setShowTestForm(false)}
        />
      </div>
    );
  }

  return (
    <div className="relative">
      <UnifiedFinancialTransactions />
      
      {/* Botón Nueva Carga */}
      <div className="fixed bottom-4 left-4 z-50">
        <Button 
          onClick={() => setShowBulkForm(true)}
          className="bg-green-600 hover:bg-green-700 text-white shadow-lg"
          size="lg"
        >
          📦 Nueva Carga
        </Button>
      </div>
      
      {/* Botones de test SOLO en el módulo de transacciones */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        <Button 
          onClick={() => setShowTest(true)}
          className="bg-red-600 hover:bg-red-700 text-white shadow-lg"
          size="sm"
        >
          🧪 Test Combobox
        </Button>
        <Button 
          onClick={() => setShowTestForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
          size="sm"
        >
          🔧 Test Form
        </Button>
      </div>

      {/* Formulario Nueva Carga */}
      <UnifiedTransactionBulkForm 
        open={showBulkForm}
        onOpenChange={setShowBulkForm}
      />
    </div>
  );
}