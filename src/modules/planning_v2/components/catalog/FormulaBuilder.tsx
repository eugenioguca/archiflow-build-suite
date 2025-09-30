/**
 * Formula Builder Component for creating calculated columns
 */
import { useState, useRef, useEffect } from 'react';
import { AlertCircle, Check, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  validateFormula,
  getFieldSuggestions,
  AVAILABLE_FIELDS,
  type FormulaField,
} from '../../services/formulaService';

interface FormulaBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (columnDef: { key: string; label: string; formula: string }) => void;
}

export function FormulaBuilder({ open, onOpenChange, onSave }: FormulaBuilderProps) {
  const [columnKey, setColumnKey] = useState('');
  const [columnLabel, setColumnLabel] = useState('');
  const [formula, setFormula] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<FormulaField[]>([]);
  const [cursorPosition, setCursorPosition] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const validation = validateFormula(formula);

  useEffect(() => {
    if (!open) {
      // Reset form when dialog closes
      setColumnKey('');
      setColumnLabel('');
      setFormula('');
      setShowSuggestions(false);
    }
  }, [open]);

  const handleFormulaChange = (value: string) => {
    setFormula(value);
    
    // Get word at cursor for autocomplete
    const cursorPos = inputRef.current?.selectionStart || 0;
    const textBeforeCursor = value.slice(0, cursorPos);
    const words = textBeforeCursor.split(/[\s+\-*/()]/);
    const currentWord = words[words.length - 1] || '';
    
    if (currentWord.length >= 1) {
      const matches = getFieldSuggestions(currentWord);
      if (matches.length > 0) {
        setSuggestions(matches);
        setShowSuggestions(true);
        return;
      }
    }
    
    setShowSuggestions(false);
  };

  const insertField = (field: FormulaField) => {
    const cursorPos = inputRef.current?.selectionStart || formula.length;
    const textBeforeCursor = formula.slice(0, cursorPos);
    const textAfterCursor = formula.slice(cursorPos);
    
    // Remove partial word
    const words = textBeforeCursor.split(/[\s+\-*/()]/);
    const partialWord = words[words.length - 1] || '';
    const textBeforeWord = textBeforeCursor.slice(0, -partialWord.length);
    
    const newFormula = `${textBeforeWord}${field.key}${textAfterCursor}`;
    setFormula(newFormula);
    setShowSuggestions(false);
    
    // Focus back on input
    setTimeout(() => {
      inputRef.current?.focus();
      const newPos = textBeforeWord.length + field.key.length;
      inputRef.current?.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const handleSave = () => {
    if (!validation.isValid) {
      return;
    }
    
    if (!columnKey || !columnLabel) {
      return;
    }
    
    onSave({
      key: columnKey,
      label: columnLabel,
      formula,
    });
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Constructor de Fórmulas</DialogTitle>
          <DialogDescription>
            Crea una columna calculada usando campos existentes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Column Definition */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="columnKey">Clave de Columna *</Label>
              <Input
                id="columnKey"
                value={columnKey}
                onChange={(e) => setColumnKey(e.target.value)}
                placeholder="ej: margen_bruto"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="columnLabel">Etiqueta *</Label>
              <Input
                id="columnLabel"
                value={columnLabel}
                onChange={(e) => setColumnLabel(e.target.value)}
                placeholder="ej: Margen Bruto"
              />
            </div>
          </div>

          {/* Formula Input */}
          <div className="space-y-2">
            <Label htmlFor="formula">Fórmula *</Label>
            <div className="relative">
              <Input
                id="formula"
                ref={inputRef}
                value={formula}
                onChange={(e) => handleFormulaChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape' && showSuggestions) {
                    setShowSuggestions(false);
                    e.preventDefault();
                  }
                }}
                placeholder="ej: total * 0.30"
                className="font-mono"
              />
              
              {/* Autocomplete Suggestions */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 max-h-48 overflow-auto">
                  {suggestions.map((field) => (
                    <button
                      key={field.key}
                      type="button"
                      onClick={() => insertField(field)}
                      className="w-full px-3 py-2 text-left hover:bg-muted flex items-center justify-between"
                    >
                      <span className="font-mono text-sm">{field.key}</span>
                      <span className="text-xs text-muted-foreground">{field.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Escribe para autocompletar campos disponibles. Operadores: + - * / ( )
            </p>
          </div>

          {/* Available Fields */}
          <div className="space-y-2">
            <Label>Campos Disponibles</Label>
            <ScrollArea className="h-32 border rounded-md p-3">
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_FIELDS.map((field) => (
                  <Badge
                    key={field.key}
                    variant="outline"
                    className="cursor-pointer hover:bg-muted"
                    onClick={() => {
                      setFormula((prev) => prev + (prev ? ' ' : '') + field.key);
                      inputRef.current?.focus();
                    }}
                  >
                    {field.key}
                  </Badge>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Validation Results */}
          {formula && (
            <div className="space-y-2">
              {validation.isValid ? (
                <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
                  <Check className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800 dark:text-green-300">
                    Fórmula válida
                    {validation.dependencies.length > 0 && (
                      <span className="block text-xs mt-1">
                        Depende de: {validation.dependencies.join(', ')}
                      </span>
                    )}
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {validation.errors.map((error, idx) => (
                      <div key={idx}>{error}</div>
                    ))}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Examples */}
          <div className="space-y-1 text-xs text-muted-foreground">
            <p className="font-medium">Ejemplos:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li><code className="bg-muted px-1 py-0.5 rounded">total * 0.30</code> - 30% del total</li>
              <li><code className="bg-muted px-1 py-0.5 rounded">pu * 1.16</code> - PU con IVA</li>
              <li><code className="bg-muted px-1 py-0.5 rounded">(precio_real * cantidad) + 100</code> - Con cargo fijo</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!validation.isValid || !columnKey || !columnLabel}
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar Columna
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
