/**
 * Editable Cell - Inline editing for catalog cells
 */
import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Check, X, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatAsCurrency, toDisplayPrecision, formatAsPercentage } from '../../utils/monetary';

interface EditableCellProps {
  value: any;
  concepto: any;
  columnKey: string;
  columnType: 'input' | 'computed';
  onSave: (conceptoId: string, field: string, value: any) => Promise<void>;
  formatFn?: (value: any) => string;
}

export function EditableCell({
  value,
  concepto,
  columnKey,
  columnType,
  onSave,
  formatFn,
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
    let displayValue = value || '';
    
    // Convert percentages to display format (0.17 -> 17)
    if (columnKey === 'desperdicio_pct' || columnKey === 'honorarios_pct') {
      displayValue = ((displayValue || 0) * 100).toFixed(2);
    } else if (typeof displayValue === 'number') {
      displayValue = displayValue.toFixed(6);
    }
    
    setEditValue(String(displayValue));
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
        // String fields (unit, provider, wbs_code)
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
      className="cursor-pointer hover:bg-muted/50 rounded px-2 -mx-2 py-1"
      onClick={(e) => {
        e.stopPropagation();
        handleEdit();
      }}
      title="Click para editar"
    >
      {formatFn ? formatFn(value || 0) : (value || '—')}
    </div>
  );
}
