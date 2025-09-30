/**
 * WBS Breadcrumb - Breadcrumb-style WBS code picker
 */
import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface WBSBreadcrumbProps {
  value: string;
  onChange: (value: string) => void;
}

export function WBSBreadcrumb({ value, onChange }: WBSBreadcrumbProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const parts = value ? value.split('.') : [];

  const handleSave = () => {
    onChange(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  return (
    <div className="flex items-center gap-2">
      {!isEditing ? (
        <>
          <div className="flex items-center gap-1 flex-1 min-h-[40px] px-3 py-2 border rounded-md bg-background">
            {parts.length === 0 ? (
              <span className="text-sm text-muted-foreground">Sin WBS</span>
            ) : (
              parts.map((part, index) => (
                <div key={index} className="flex items-center">
                  {index > 0 && (
                    <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />
                  )}
                  <span className="text-sm font-medium px-2 py-1 bg-muted rounded">
                    {part}
                  </span>
                </div>
              ))
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsEditing(true)}
          >
            Editar
          </Button>
        </>
      ) : (
        <>
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder="ej: 1.2.3"
            className="flex-1"
          />
          <Button size="sm" onClick={handleSave}>
            OK
          </Button>
          <Button size="sm" variant="ghost" onClick={handleCancel}>
            ✕
          </Button>
        </>
      )}
    </div>
  );
}
