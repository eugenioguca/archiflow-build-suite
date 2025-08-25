import { useState } from 'react';
import { UnifiedFinancialTransactions } from "@/components/UnifiedFinancialTransactions";
import { TestCombobox } from '@/components/TestCombobox';
import { UnifiedTransactionBulkForm } from '@/components/UnifiedTransactionBulkForm';
import { Button } from '@/components/ui/button';

export default function UnifiedTransactions() {
  const [showTest, setShowTest] = useState(false);
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


  return (
    <div className="relative">
      <UnifiedFinancialTransactions onBulkFormOpen={() => setShowBulkForm(true)} />
      
      {/* Botones de test SOLO en el módulo de transacciones */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        <Button 
          onClick={() => setShowTest(true)}
          className="bg-red-600 hover:bg-red-700 text-white shadow-lg"
          size="sm"
        >
          🧪 Test Combobox
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