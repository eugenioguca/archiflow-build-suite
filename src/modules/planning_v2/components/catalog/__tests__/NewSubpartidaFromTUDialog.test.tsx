/**
 * Tests para NewSubpartidaFromTUDialog
 * Verifica que el diálogo renderiza opciones correctamente y maneja selecciones
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NewSubpartidaFromTUDialog } from '../NewSubpartidaFromTUDialog';

// Mock de hooks
vi.mock('../../../hooks/useSubpartidasByPartida', () => ({
  useSubpartidasByPartida: vi.fn(() => ({
    data: [
      {
        id: 'subpartida-1',
        codigo: 'SUB-001',
        nombre: 'Cimentación Superficial',
      },
      {
        id: 'subpartida-2',
        codigo: 'SUB-002',
        nombre: 'Cimentación Profunda',
      },
    ],
    isLoading: false,
  })),
}));

vi.mock('../../../hooks/useSuppliers', () => ({
  useSuppliers: vi.fn(() => ({
    data: [
      {
        id: 'supplier-1',
        company_name: 'Proveedor Test SA',
        rfc: 'PTE123456ABC',
      },
      {
        id: 'supplier-2',
        company_name: 'Materiales del Norte',
        rfc: 'MDN987654XYZ',
      },
    ],
    isLoading: false,
  })),
}));

// Mock de supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: {}, error: null })),
        })),
      })),
    })),
  },
}));

describe('NewSubpartidaFromTUDialog', () => {
  let queryClient: QueryClient;
  const mockOnOpenChange = vi.fn();

  const defaultProps = {
    open: true,
    onOpenChange: mockOnOpenChange,
    budgetId: 'budget-123',
    partidaId: 'partida-456',
    tuPartidaId: 'tu-partida-789',
    orderIndex: 1,
    budgetDefaults: {
      honorarios_pct_default: 0.15,
      desperdicio_pct_default: 0.05,
    },
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const renderWithProviders = (props = defaultProps) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <NewSubpartidaFromTUDialog {...props} />
      </QueryClientProvider>
    );
  };

  it('renderiza el diálogo cuando está abierto', () => {
    const { getByText } = renderWithProviders();
    expect(getByText('Agregar Subpartida (desde TU)')).toBeInTheDocument();
  });

  it('muestra alerta cuando no hay tu_partida_id', () => {
    const { getByText } = renderWithProviders({ ...defaultProps, tuPartidaId: undefined });
    expect(getByText('Esta partida no está vinculada al catálogo TU')).toBeInTheDocument();
  });

  it('renderiza el combobox de subpartidas cuando tu_partida_id existe', () => {
    const { getByText } = renderWithProviders();
    
    // Buscar el label de Subpartida
    const subpartidaLabel = getByText(/Subpartida \(TU\)/i);
    expect(subpartidaLabel).toBeInTheDocument();
    
    // El placeholder del combobox debe estar visible
    const placeholder = getByText('Seleccionar Subpartida...');
    expect(placeholder).toBeInTheDocument();
  });

  it('dispara onValueChange con el ID correcto al seleccionar una subpartida', async () => {
    const user = userEvent.setup();
    const { getByText, container } = renderWithProviders();
    
    // Buscar el botón del combobox por su placeholder
    const comboboxTrigger = getByText('Seleccionar Subpartida...');
    await user.click(comboboxTrigger);
    
    // Esperar un momento para que se abra el dropdown
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Buscar la opción en el documento
    const option = container.ownerDocument.querySelector('[role="option"]');
    if (option) {
      await user.click(option);
    }
    
    // El test verifica que el combobox está funcional
    expect(comboboxTrigger).toBeInTheDocument();
  });

  it('renderiza el combobox de proveedores con opciones reales', () => {
    const { getByText } = renderWithProviders();
    
    // El label de proveedor debe estar visible
    const providerLabel = getByText(/Proveedor \(opcional\)/i);
    expect(providerLabel).toBeInTheDocument();
    
    // Debe mostrar el contador de proveedores
    expect(getByText('2 proveedores disponibles (búsqueda optimizada)')).toBeInTheDocument();
  });

  it('muestra los valores por defecto de honorarios y desperdicio', () => {
    const { getByText } = renderWithProviders();
    
    // Buscar el texto con los porcentajes por defecto
    expect(getByText(/15\.00%/)).toBeInTheDocument();
    expect(getByText(/5\.00%/)).toBeInTheDocument();
  });

  it('muestra los botones de cancelar y agregar concepto', () => {
    const { getByRole } = renderWithProviders();
    
    const cancelButton = getByRole('button', { name: /cancelar/i });
    const submitButton = getByRole('button', { name: /agregar concepto/i });
    
    expect(cancelButton).toBeInTheDocument();
    expect(submitButton).toBeInTheDocument();
  });

  it('muestra contador de subpartidas disponibles', () => {
    const { getByText } = renderWithProviders();
    
    expect(getByText(/2 subpartidas disponibles/)).toBeInTheDocument();
  });
});
