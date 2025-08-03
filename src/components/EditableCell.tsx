import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Check, X, Edit2 } from "lucide-react"

interface EditableCellProps {
  value: string
  onSave: (newValue: string) => void
  type?: "text" | "number" | "email" | "phone" | "select"
  options?: { value: string; label: string }[]
  displayTransform?: (value: string) => string
  className?: string
}

export function EditableCell({ value, onSave, type = "text", options = [], displayTransform, className }: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)

  const handleSave = () => {
    onSave(editValue)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditValue(value)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        {type === 'select' ? (
          <Select value={editValue} onValueChange={setEditValue}>
            <SelectTrigger className="h-8 text-sm bg-background">
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
            type={type}
            className="h-8 text-sm bg-background"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave()
              if (e.key === 'Escape') handleCancel()
            }}
          />
        )}
        <Button size="sm" variant="ghost" onClick={handleSave} className="h-8 w-8 p-0">
          <Check className="h-4 w-4 text-green-600" />
        </Button>
        <Button size="sm" variant="ghost" onClick={handleCancel} className="h-8 w-8 p-0">
          <X className="h-4 w-4 text-red-600" />
        </Button>
      </div>
    )
  }

  const displayValue = displayTransform ? displayTransform(value) : value;

  return (
    <div className="flex items-center gap-2 group">
      <span className={className}>{displayValue}</span>
      <Button 
        size="sm" 
        variant="ghost" 
        onClick={() => setIsEditing(true)}
        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Edit2 className="h-3 w-3" />
      </Button>
    </div>
  )
}