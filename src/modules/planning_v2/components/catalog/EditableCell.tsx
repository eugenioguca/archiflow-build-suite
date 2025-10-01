/**
 * Editable Cell - Inline editing for catalog cells
 * Shows effective values with defaults and allows override editing
 */
import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Check, X, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatAsCurrency, toDisplayPrecision, formatAsPercentage } from '../../utils/monetary';
import { getEffectiveHonorarios, getEffectiveDesperdicio, getDefaultSourceLabel } from '../../utils/defaults';

interface EditableCellProps {
  value: any;
  concepto: any;
  columnKey: string;
  columnType: 'input' | 'computed';
  onSave: (conceptoId: string, field: string, value: any) => Promise<void>;
  formatFn?: (value: any) => string;
  budgetSettings?: any;
}

export function EditableCell({
  value,
  concepto,
  columnKey,
  columnType,
  onSave,
  formatFn,
  budgetSettings,
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Calculate effective value and check if using default
  let effectiveValue = value;
  let isUsingDefault = false;
  let defaultSource: 'concepto' | 'partida' | 'budget' | 'system' = 'concepto';
  
  if (columnKey === 'honorarios_pct' && budgetSettings) {
    const result = getEffectiveHonorarios({
      concepto: { honorarios_pct: value },
      budgetSettings,
    });
    effectiveValue = result.value;
    isUsingDefault = result.isDefault;
    defaultSource = result.source;
  } else if (columnKey === 'desperdicio_pct' && budgetSettings) {
    const result = getEffectiveDesperdicio({
      concepto: { desperdicio_pct: value },
      budgetSettings,
    });
    effectiveValue = result.value;
    isUsingDefault = result.isDefault;
    defaultSource = result.source;
  }

  // Non-editable computed fields
  if (columnType === 'computed') {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Lock className="h-3 w-3" />
        <span>
          {formatFn ? formatFn(value || 0) : value || '—'}
        </span>
      </div>
    );
  }

  // Editable fields only for specific columns
  const editableColumns = [
    'code',
    'short_description',
    'cantidad_real',
    'desperdicio_pct',
    'precio_real',
    'honorarios_pct',
    'unit',
    'provider',
    'wbs_code',
  ];

  if (!editableColumns.includes(columnKey)) {
    return <span>{formatFn ? formatFn(value) : (value || '—')}</span>;
  }

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleEdit = () => {
    // Format value for editing - use effective value
    let displayValue = effectiveValue?.toString() || '';
    
    if (columnKey === 'desperdicio_pct' || columnKey === 'honorarios_pct') {
      // Convert to percentage for editing (0.15 -> 15)
      displayValue = (effectiveValue * 100).toFixed(2);
    } else if (typeof effectiveValue === 'number') {
      displayValue = effectiveValue.toFixed(2);
    }
    
    setEditValue(displayValue);
    setIsEditing(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let parsedValue: any = editValue;

      // Parse based on field type
      if (columnKey === 'cantidad_real' || columnKey === 'precio_real') {
        parsedValue = parseFloat(editValue) || 0;
      } else if (columnKey === 'desperdicio_pct' || columnKey === 'honorarios_pct') {
        // Convert percentage display to decimal (17 -> 0.17)
        parsedValue = (parseFloat(editValue) || 0) / 100;
      } else {
        // String fields (unit, provider)
        parsedValue = editValue.trim() || null;
      }

      await onSave(concepto.id, columnKey, parsedValue);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving cell:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  // Render display value
  const renderDisplayValue = () => {
    const formatted = formatFn ? formatFn(effectiveValue) : effectiveValue?.toString() || '-';
    
    if (isUsingDefault && (columnKey === 'honorarios_pct' || columnKey === 'desperdicio_pct')) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5">
                <span>{formatted}</span>
                <Badge 
                  variant="secondary" 
                  className="text-[10px] px-1 py-0 h-4 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-0"
                >
                  Default
                </Badge>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p className="text-xs">{getDefaultSourceLabel(defaultSource)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Haz clic para definir un valor específico
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    
    return <span className="whitespace-pre-wrap break-words">{formatted}</span>;
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <Input
          ref={inputRef}
          type={
            ['cantidad_real', 'precio_real', 'desperdicio_pct', 'honorarios_pct'].includes(columnKey)
              ? 'number'
              : 'text'
          }
          step={columnKey === 'precio_real' ? '0.01' : '0.000001'}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-7 w-full"
          disabled={isSaving}
        />
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
          onClick={handleSave}
          disabled={isSaving}
        >
          <Check className="h-3 w-3" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
          onClick={handleCancel}
          disabled={isSaving}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className="cursor-pointer hover:bg-muted/50 rounded px-2 -mx-2 py-1 min-w-0 break-words"
      onClick={(e) => {
        e.stopPropagation();
        handleEdit();
      }}
      title="Click para editar"
    >
      {renderDisplayValue()}
    </div>
  );
}
