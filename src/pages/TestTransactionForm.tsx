import { UnifiedTransactionForm } from '@/components/UnifiedTransactionForm';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';

export default function TestTransactionForm() {
  const [isFormOpen, setIsFormOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          onClick={() => window.history.back()}
          variant="outline"
          size="sm"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <h1 className="text-2xl font-bold">Test Formulario de Transacciones</h1>
      </div>
      
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="p-6 border rounded-lg bg-card">
          <h2 className="text-xl font-semibold mb-4">Prueba del SearchableCombobox en Formulario Real</h2>
          <p className="text-muted-foreground mb-4">
            Haz clic en el botón de abajo para abrir el formulario de transacciones y probar todos los comboboxes.
          </p>
          <Button 
            onClick={() => setIsFormOpen(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            🔧 Abrir Formulario de Transacciones
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold text-green-600 mb-2">✅ Lo que debe funcionar:</h3>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Escribir instantáneamente sin lag</li>
              <li>• Filtrado en tiempo real</li>
              <li>• Scroll fluido en listas largas</li>
              <li>• Selección con click</li>
              <li>• Navegación con teclado ↑↓</li>
              <li>• Enter para seleccionar</li>
              <li>• Escape para cerrar</li>
            </ul>
          </div>
          
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold text-red-600 mb-2">❌ Problemas a reportar:</h3>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Input con delay o no responde</li>
              <li>• Dropdown no se ve (transparente)</li>
              <li>• No filtra al escribir</li>
              <li>• Scroll no funciona</li>
              <li>• No se puede seleccionar</li>
              <li>• Errores en consola</li>
              <li>• Performance lenta</li>
            </ul>
          </div>
        </div>
      </div>

      <UnifiedTransactionForm 
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
      />
    </div>
  );
}