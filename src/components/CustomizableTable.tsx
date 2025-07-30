import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EditableCell } from "@/components/EditableCell";
import { Plus, Settings, Edit2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Column {
  id: string;
  header: string;
  type: "text" | "number" | "date" | "select" | "custom";
  options?: string[]; // Para columnas de tipo select
  width?: string;
  sortable?: boolean;
  editable?: boolean;
}

interface CustomizableTableProps {
  data: Record<string, any>[];
  columns: Column[];
  onDataChange: (newData: Record<string, any>[]) => void;
  onColumnsChange: (newColumns: Column[]) => void;
  storageKey: string;
  title: string;
  canAddRows?: boolean;
  canDeleteRows?: boolean;
  canCustomizeColumns?: boolean;
}

export function CustomizableTable({
  data,
  columns,
  onDataChange,
  onColumnsChange,
  storageKey,
  title,
  canAddRows = true,
  canDeleteRows = true,
  canCustomizeColumns = true
}: CustomizableTableProps) {
  const [isColumnDialogOpen, setIsColumnDialogOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<Column | null>(null);
  const { toast } = useToast();

  // Cargar configuración de columnas desde localStorage
  useEffect(() => {
    const savedColumns = localStorage.getItem(`${storageKey}_columns`);
    if (savedColumns) {
      try {
        const parsedColumns = JSON.parse(savedColumns);
        onColumnsChange(parsedColumns);
      } catch (error) {
        console.error('Error loading saved columns:', error);
      }
    }
  }, [storageKey, onColumnsChange]);

  const saveColumns = (newColumns: Column[]) => {
    localStorage.setItem(`${storageKey}_columns`, JSON.stringify(newColumns));
    onColumnsChange(newColumns);
  };

  const updateColumnHeader = (columnId: string, newHeader: string) => {
    const updatedColumns = columns.map(col => 
      col.id === columnId ? { ...col, header: newHeader } : col
    );
    saveColumns(updatedColumns);
    toast({
      title: "Columna actualizada",
      description: "El título de la columna se ha actualizado",
    });
  };

  const addNewColumn = (columnData: Omit<Column, 'id'>) => {
    const newColumn: Column = {
      ...columnData,
      id: `custom_${Date.now()}`,
    };
    
    const updatedColumns = [...columns, newColumn];
    saveColumns(updatedColumns);
    
    // Agregar la nueva columna a todos los datos existentes
    const updatedData = data.map(row => ({
      ...row,
      [newColumn.id]: ""
    }));
    onDataChange(updatedData);
    
    toast({
      title: "Columna agregada",
      description: "Nueva columna agregada correctamente",
    });
    setIsColumnDialogOpen(false);
    setEditingColumn(null);
  };

  const deleteColumn = (columnId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta columna?')) return;
    
    const updatedColumns = columns.filter(col => col.id !== columnId);
    saveColumns(updatedColumns);
    
    // Remover la columna de todos los datos
    const updatedData = data.map(row => {
      const { [columnId]: deleted, ...rest } = row;
      return rest;
    });
    onDataChange(updatedData);
    
    toast({
      title: "Columna eliminada",
      description: "La columna se ha eliminado correctamente",
    });
  };

  const updateCellValue = (rowIndex: number, columnId: string, newValue: any) => {
    const updatedData = [...data];
    updatedData[rowIndex] = {
      ...updatedData[rowIndex],
      [columnId]: newValue
    };
    onDataChange(updatedData);
  };

  const addNewRow = () => {
    const newRow = columns.reduce((acc, col) => {
      acc[col.id] = col.type === 'number' ? 0 : '';
      return acc;
    }, {} as Record<string, any>);
    
    newRow.id = Date.now().toString();
    onDataChange([...data, newRow]);
    
    toast({
      title: "Fila agregada",
      description: "Nueva fila agregada correctamente",
    });
  };

  const deleteRow = (rowIndex: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta fila?')) return;
    
    const updatedData = data.filter((_, index) => index !== rowIndex);
    onDataChange(updatedData);
    
    toast({
      title: "Fila eliminada",
      description: "La fila se ha eliminado correctamente",
    });
  };

  const renderCell = (row: Record<string, any>, column: Column, rowIndex: number) => {
    const value = row[column.id] || '';
    
    if (column.type === 'custom' || !column.editable) {
      return <span>{value}</span>;
    }
    
    if (column.type === 'select' && column.options) {
      return (
        <Select 
          value={value} 
          onValueChange={(newValue) => updateCellValue(rowIndex, column.id, newValue)}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {column.options.map(option => (
              <SelectItem key={option} value={option}>{option}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    
    return (
      <EditableCell
        value={String(value)}
        onSave={(newValue) => {
          const processedValue = column.type === 'number' ? parseFloat(newValue) || 0 : newValue;
          updateCellValue(rowIndex, column.id, processedValue);
        }}
        type={column.type === 'number' ? 'number' : 'text'}
      />
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">{title}</h3>
        <div className="flex gap-2">
          {canAddRows && (
            <Button size="sm" onClick={addNewRow}>
              <Plus className="h-4 w-4 mr-1" />
              Agregar Fila
            </Button>
          )}
          {canCustomizeColumns && (
            <Dialog open={isColumnDialogOpen} onOpenChange={setIsColumnDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Settings className="h-4 w-4 mr-1" />
                  Personalizar Columnas
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Gestionar Columnas</DialogTitle>
                </DialogHeader>
                <ColumnManager
                  columns={columns}
                  onAddColumn={addNewColumn}
                  onDeleteColumn={deleteColumn}
                  editingColumn={editingColumn}
                  setEditingColumn={setEditingColumn}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.id} style={{ width: column.width }}>
                <EditableCell
                  value={column.header}
                  onSave={(newHeader) => updateColumnHeader(column.id, newHeader)}
                  className="font-medium"
                />
              </TableHead>
            ))}
            {canDeleteRows && <TableHead>Acciones</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, rowIndex) => (
            <TableRow key={row.id || rowIndex}>
              {columns.map((column) => (
                <TableCell key={column.id}>
                  {renderCell(row, column, rowIndex)}
                </TableCell>
              ))}
              {canDeleteRows && (
                <TableCell>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteRow(rowIndex)}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

interface ColumnManagerProps {
  columns: Column[];
  onAddColumn: (column: Omit<Column, 'id'>) => void;
  onDeleteColumn: (columnId: string) => void;
  editingColumn: Column | null;
  setEditingColumn: (column: Column | null) => void;
}

function ColumnManager({ columns, onAddColumn, onDeleteColumn, editingColumn, setEditingColumn }: ColumnManagerProps) {
  const [newColumn, setNewColumn] = useState<Omit<Column, 'id'>>({
    header: '',
    type: 'text',
    editable: true,
    sortable: true
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColumn.header.trim()) return;
    
    onAddColumn(newColumn);
    setNewColumn({
      header: '',
      type: 'text',
      editable: true,
      sortable: true
    });
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="header">Título de Columna</Label>
            <Input
              id="header"
              value={newColumn.header}
              onChange={(e) => setNewColumn({ ...newColumn, header: e.target.value })}
              placeholder="Ej: Nueva Columna"
              required
            />
          </div>
          <div>
            <Label htmlFor="type">Tipo</Label>
            <Select 
              value={newColumn.type} 
              onValueChange={(value: Column['type']) => setNewColumn({ ...newColumn, type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Texto</SelectItem>
                <SelectItem value="number">Número</SelectItem>
                <SelectItem value="date">Fecha</SelectItem>
                <SelectItem value="select">Lista</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {newColumn.type === 'select' && (
          <div>
            <Label htmlFor="options">Opciones (separadas por coma)</Label>
            <Input
              id="options"
              placeholder="Opción 1, Opción 2, Opción 3"
              onChange={(e) => {
                const options = e.target.value.split(',').map(opt => opt.trim()).filter(Boolean);
                setNewColumn({ ...newColumn, options });
              }}
            />
          </div>
        )}

        <Button type="submit" className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Agregar Columna
        </Button>
      </form>

      <div className="space-y-2">
        <h4 className="font-medium">Columnas Existentes</h4>
        {columns.filter(col => col.id.startsWith('custom_')).map((column) => (
          <div key={column.id} className="flex items-center justify-between p-2 border rounded">
            <span>{column.header}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDeleteColumn(column.id)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}