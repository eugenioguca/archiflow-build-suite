/**
 * Provider Cell - Editable cell for provider selection and notes
 */
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';
import { Label } from '@/components/ui/label';
import { useProviders, useProviderById } from '../../hooks/useProviders';
import { useDebounce } from '@/hooks/use-debounce';

interface ProviderCellProps {
  concepto: any;
  onSave: (conceptoId: string, field: string, value: any) => Promise<void>;
}

export function ProviderCell({ concepto, onSave }: ProviderCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [providerId, setProviderId] = useState<string>(concepto.provider_id || '');
  const [providerNotes, setProviderNotes] = useState(concepto.provider_notes || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const debouncedSearch = useDebounce(searchQuery, 300);
  const { data: providers = [], isLoading } = useProviders(debouncedSearch);
  const { data: currentProvider } = useProviderById(concepto.provider_id);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save both fields
      await onSave(concepto.id, 'provider_id', providerId || null);
      await onSave(concepto.id, 'provider_notes', providerNotes || null);
      setIsOpen(false);
    } catch (error) {
      console.error('Error saving provider:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const providerItems = providers.map(p => ({
    value: p.id,
    label: p.company_name,
    codigo: p.rfc,
    searchText: `${p.company_name} ${p.rfc || ''} ${p.contact_name || ''}`.toLowerCase(),
  }));

  const displayValue = currentProvider 
    ? `${currentProvider.company_name}${currentProvider.rfc ? ` (${currentProvider.rfc})` : ''}`
    : concepto.provider || '—';

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <div 
          className="cursor-pointer hover:bg-muted/50 px-3 py-2 rounded transition-colors min-h-[2rem] flex items-center"
          title={concepto.provider_notes ? `Notas: ${concepto.provider_notes}` : 'Click para editar proveedor'}
        >
          <span className="text-sm truncate">
            {displayValue}
            {concepto.provider_notes && (
              <span className="ml-2 text-xs text-muted-foreground">📝</span>
            )}
          </span>
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Seleccionar Proveedor</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Proveedor</Label>
            <SearchableCombobox
              items={providerItems}
              value={providerId}
              onValueChange={setProviderId}
              placeholder="Buscar proveedor..."
              searchPlaceholder="Buscar por nombre o RFC..."
              emptyText="No se encontraron proveedores"
              loading={isLoading}
              showCodes={true}
              searchFields={['label', 'codigo', 'searchText']}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="provider-notes">Notas del Proveedor</Label>
            <Textarea
              id="provider-notes"
              value={providerNotes}
              onChange={(e) => setProviderNotes(e.target.value)}
              placeholder="Notas adicionales sobre el proveedor para este concepto..."
              rows={4}
              className="resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
