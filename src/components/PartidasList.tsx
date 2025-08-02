import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { EditableCell } from '@/components/EditableCell';
import { Building2, Calculator } from 'lucide-react';

interface Partida {
  id: string;
  codigo: string;
  descripcion: string;
  unidad: string;
  cantidad: number;
  precio_unitario: number;
  total: number;
  supplier_id?: string;
}

interface Supplier {
  id: string;
  company_name: string;
}

interface PartidasListProps {
  partidas: Partida[];
  suppliers: Supplier[];
  onPartidasUpdate: (partidas: Partida[]) => void;
}

export function PartidasList({ partidas, suppliers, onPartidasUpdate }: PartidasListProps) {
  const updatePartida = (id: string, field: string, value: string | number) => {
    const updatedPartidas = partidas.map(partida => {
      if (partida.id === id) {
        const updated = { ...partida, [field]: value };
        // Recalcular total si se modifica cantidad o precio
        if (field === 'cantidad' || field === 'precio_unitario') {
          updated.total = updated.cantidad * updated.precio_unitario;
        }
        return updated;
      }
      return partida;
    });
    onPartidasUpdate(updatedPartidas);
  };

  const assignSupplier = (partidaId: string, supplierId: string) => {
    updatePartida(partidaId, 'supplier_id', supplierId);
  };

  const totalGeneral = partidas.reduce((sum, partida) => sum + partida.total, 0);

  if (partidas.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No hay partidas importadas</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Lista de Partidas ({partidas.length})
          </span>
          <Badge variant="secondary" className="text-lg">
            Total: ${totalGeneral.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Unidad</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Precio Unit.</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Proveedor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partidas.map((partida) => (
                <TableRow key={partida.id}>
                  <TableCell className="font-mono">{partida.codigo}</TableCell>
                  <TableCell>
                    <EditableCell
                      value={partida.descripcion}
                      onSave={(value) => updatePartida(partida.id, 'descripcion', value)}
                    />
                  </TableCell>
                  <TableCell>{partida.unidad}</TableCell>
                  <TableCell>
                    <EditableCell
                      value={partida.cantidad.toString()}
                      type="number"
                      onSave={(value) => updatePartida(partida.id, 'cantidad', parseFloat(value) || 0)}
                    />
                  </TableCell>
                  <TableCell>
                    <EditableCell
                      value={partida.precio_unitario.toString()}
                      type="number"
                      onSave={(value) => updatePartida(partida.id, 'precio_unitario', parseFloat(value) || 0)}
                    />
                  </TableCell>
                  <TableCell className="font-semibold">
                    ${partida.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={partida.supplier_id || undefined}
                      onValueChange={(value) => assignSupplier(partida.id, value)}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.company_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}