import React, { useState } from "react"
import { SearchableCombobox } from "@/components/ui/searchable-combobox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const testItems = Array.from({ length: 1000 }, (_, i) => ({
  value: `item-${i}`,
  label: `Opción ${i + 1}`,
  codigo: `COD${i.toString().padStart(3, '0')}`,
  searchText: `Test item ${i + 1} búsqueda`,
}))

export function TestCombobox() {
  const [selectedValue, setSelectedValue] = useState<string>("")
  const [debug, setDebug] = useState<string[]>([])

  const addDebug = (message: string) => {
    console.log(`[TestCombobox] ${message}`)
    setDebug(prev => [...prev.slice(-5), `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const handleValueChange = (value: string) => {
    setSelectedValue(value)
    addDebug(`Value changed to: ${value}`)
  }

  const clearValue = () => {
    setSelectedValue("")
    addDebug("Value cleared")
  }

  return (
    <Card className="w-full max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle>Test SearchableCombobox</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Selecciona una opción:</label>
          <SearchableCombobox
            items={testItems}
            value={selectedValue}
            onValueChange={handleValueChange}
            placeholder="Buscar opción..."
            searchPlaceholder="Escribe para buscar..."
            emptyText="No hay opciones disponibles"
            showCodes={true}
            searchFields={['label', 'codigo', 'searchText']}
            maxHeight="300px"
          />
        </div>
        
        <div className="space-y-2">
          <p className="text-sm">Valor seleccionado: <code>{selectedValue || "ninguno"}</code></p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={clearValue}
          >
            Limpiar selección
          </Button>
        </div>

        <div className="space-y-1">
          <p className="text-sm font-medium">Debug log:</p>
          <div className="text-xs space-y-1 max-h-32 overflow-y-auto bg-muted p-2 rounded">
            {debug.length === 0 && <p className="text-muted-foreground">No hay logs aún...</p>}
            {debug.map((log, index) => (
              <div key={index} className="font-mono">{log}</div>
            ))}
          </div>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Este test incluye 1000 items para probar virtualización</p>
          <p>• Intenta escribir para buscar</p>
          <p>• Usa las flechas del teclado para navegar</p>
          <p>• Presiona Enter para seleccionar</p>
        </div>
      </CardContent>
    </Card>
  )
}