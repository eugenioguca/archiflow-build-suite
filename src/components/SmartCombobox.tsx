import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Check, ChevronsUpDown, Plus, Edit2, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface ComboboxItem {
  value: string
  label: string
  id?: string
}

interface SmartComboboxProps {
  value?: string
  onValueChange: (value: string) => void
  items: ComboboxItem[]
  placeholder?: string
  emptyText?: string
  label?: string
  className?: string
  dropdownType?: 'cuentas_mayor' | 'partidas' | 'descripciones_producto'
  onItemsChange?: () => void
  allowEdit?: boolean
  required?: boolean
}

export function SmartCombobox({
  value,
  onValueChange,
  items,
  placeholder = "Seleccionar opción...",
  emptyText = "No se encontraron opciones.",
  label,
  className,
  dropdownType,
  onItemsChange,
  allowEdit = false,
  required = false
}: SmartComboboxProps) {
  const [open, setOpen] = useState(false)
  const [manageOpen, setManageOpen] = useState(false)
  const [newItemLabel, setNewItemLabel] = useState("")
  const [editingItem, setEditingItem] = useState<ComboboxItem | null>(null)
  const [editLabel, setEditLabel] = useState("")
  const { toast } = useToast()

  const dropdownHeight = useMemo(() => {
    const itemCount = items.length;
    if (itemCount <= 20) return 'max-h-48';
    if (itemCount <= 100) return 'max-h-72'; 
    if (itemCount <= 200) return 'max-h-96';
    return 'max-h-[50vh]';
  }, [items.length])

  const selectedItem = items.find(item => item.value === value)

  const handleAddItem = async () => {
    if (!newItemLabel.trim() || !dropdownType) return

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single()

      if (!profile) {
        toast({
          title: "Error",
          description: "No se pudo obtener el perfil del usuario",
          variant: "destructive",
        })
        return
      }

      const newValue = newItemLabel.toLowerCase().replace(/\s+/g, '_')
      const maxOrder = Math.max(...items.map(item => 
        parseInt(item.id?.split('-')[1] || '0')
      ), 0)

      const { error } = await supabase
        .from('material_dropdown_options')
        .insert({
          dropdown_type: dropdownType,
          option_value: newValue,
          option_label: newItemLabel.trim(),
          order_index: maxOrder + 1,
          created_by: profile.id
        })

      if (error) throw error

      toast({
        title: "Éxito",
        description: "Opción agregada correctamente",
      })

      setNewItemLabel("")
      setManageOpen(false)
      onItemsChange?.()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al agregar la opción",
        variant: "destructive",
      })
    }
  }

  const handleEditItem = async () => {
    if (!editLabel.trim() || !editingItem?.id || !dropdownType) return

    try {
      const { error } = await supabase
        .from('material_dropdown_options')
        .update({
          option_label: editLabel.trim(),
        })
        .eq('id', editingItem.id)

      if (error) throw error

      toast({
        title: "Éxito",
        description: "Opción actualizada correctamente",
      })

      setEditingItem(null)
      setEditLabel("")
      onItemsChange?.()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al actualizar la opción",
        variant: "destructive",
      })
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('material_dropdown_options')
        .update({ is_active: false })
        .eq('id', itemId)

      if (error) throw error

      toast({
        title: "Éxito",
        description: "Opción eliminada correctamente",
      })

      onItemsChange?.()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al eliminar la opción",
        variant: "destructive",
      })
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label className="text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="flex-1 justify-between"
            >
              {selectedItem ? selectedItem.label : placeholder}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-[--radix-popover-trigger-width] max-w-none p-0 z-[10000]" 
            align="start"
            side="bottom"
            avoidCollisions={false}
            container={document.body}
          >
            <Command>
              <CommandInput placeholder="Buscar..." />
              <ScrollArea className={dropdownHeight}>
                <CommandList>
                  <CommandEmpty>{emptyText}</CommandEmpty>
                  <CommandGroup>
                    {items.map((item) => (
                      <CommandItem
                        key={item.value}
                        value={item.value}
                        onSelect={(currentValue) => {
                          onValueChange(currentValue === value ? "" : currentValue)
                          setOpen(false)
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            value === item.value ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {item.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </ScrollArea>
            </Command>
          </PopoverContent>
        </Popover>

        {allowEdit && dropdownType && (
          <Dialog open={manageOpen} onOpenChange={setManageOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Gestionar Opciones</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                {/* Add New Item */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Nueva opción..."
                    value={newItemLabel}
                    onChange={(e) => setNewItemLabel(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={handleAddItem} disabled={!newItemLabel.trim()}>
                    Agregar
                  </Button>
                </div>

                {/* Edit Existing Items */}
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {items.map((item) => (
                    <div key={item.value} className="flex items-center gap-2 p-2 border rounded">
                      {editingItem?.value === item.value ? (
                        <div className="flex gap-2 flex-1">
                          <Input
                            value={editLabel}
                            onChange={(e) => setEditLabel(e.target.value)}
                            className="flex-1"
                          />
                          <Button size="sm" onClick={handleEditItem}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => {
                              setEditingItem(null)
                              setEditLabel("")
                            }}
                          >
                            ✕
                          </Button>
                        </div>
                      ) : (
                        <>
                          <span className="flex-1">{item.label}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingItem(item)
                              setEditLabel(item.label)
                            }}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          {item.id && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteItem(item.id!)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  )
}