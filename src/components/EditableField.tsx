import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, X, Edit2 } from "lucide-react";

interface EditableFieldProps {
  value: string | number;
  onSave: (value: string | number) => void;
  type?: 'text' | 'number' | 'select' | 'email' | 'phone';
  options?: { value: string; label: string }[];
  className?: string;
  displayTransform?: (value: string | number) => string;
}

export function EditableField({ 
  value, 
  onSave, 
  type = 'text', 
  options = [], 
  className = "",
  displayTransform
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState((value || '').toString());

  const handleSave = () => {
    const finalValue = type === 'number' ? parseFloat(editValue) || 0 : editValue;
    onSave(finalValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue((value || '').toString());
    setIsEditing(false);
  };

  const displayValue = displayTransform ? displayTransform(value) : (value || '').toString();

  if (!isEditing) {
    return (
      <div className={`group flex items-center gap-2 ${className}`}>
        <span className="text-sm">{displayValue}</span>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => setIsEditing(true)}
        >
          <Edit2 className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {type === 'select' ? (
        <Select value={editValue} onValueChange={setEditValue}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          type={type === 'number' ? 'number' : 'text'}
          className="h-8 text-xs"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') handleCancel();
          }}
        />
      )}
      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={handleSave}>
        <Check className="h-3 w-3 text-green-600" />
      </Button>
      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={handleCancel}>
        <X className="h-3 w-3 text-red-600" />
      </Button>
    </div>
  );
}