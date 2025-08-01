import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Edit, Trash2, Package, Barcode, DollarSign } from 'lucide-react';
import { SATKeySelector } from './SATKeySelector';

interface Product {
  id: string;
  codigo_interno: string;
  nombre: string;
  descripcion: string;
  clave_sat: string;
  unidad_sat: string;
  precio_unitario: number;
  tipo: string; // Changed from union type to string
  activo: boolean;
  categoria: string;
  stock_actual: number;
  cuenta_contable: string;
}

export function ProductCatalogManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    codigo_interno: '',
    nombre: '',
    descripcion: '',
    clave_sat: '',
    unidad_sat: 'H87', // Default to pieces
    precio_unitario: 0,
    tipo: 'producto' as 'producto' | 'servicio',
    categoria: '',
    cuenta_contable: ''
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(product =>
        product.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.codigo_interno.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.clave_sat.includes(searchTerm) ||
        product.categoria?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredProducts(filtered);
    }
  }, [searchTerm, products]);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('products_services')
        .select('*')
        .order('nombre');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los productos',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const productData = {
        ...formData,
        created_by: user.id,
        activo: true
      };

      let error;
      
      if (editingProduct) {
        const { error: updateError } = await supabase
          .from('products_services')
          .update(productData)
          .eq('id', editingProduct.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('products_services')
          .insert([productData]);
        error = insertError;
      }

      if (error) throw error;

      toast({
        title: 'Éxito',
        description: editingProduct ? 'Producto actualizado correctamente' : 'Producto creado correctamente'
      });

      setShowDialog(false);
      setEditingProduct(null);
      resetForm();
      fetchProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      toast({
        title: 'Error',
        description: 'Error al guardar el producto',
        variant: 'destructive'
      });
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      codigo_interno: product.codigo_interno,
      nombre: product.nombre,
      descripcion: product.descripcion || '',
      clave_sat: product.clave_sat,
      unidad_sat: product.unidad_sat,
      precio_unitario: product.precio_unitario,
      tipo: product.tipo as any,
      categoria: product.categoria || '',
      cuenta_contable: product.cuenta_contable || ''
    });
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este producto?')) return;

    try {
      const { error } = await supabase
        .from('products_services')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Éxito',
        description: 'Producto eliminado correctamente'
      });

      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: 'Error',
        description: 'Error al eliminar el producto',
        variant: 'destructive'
      });
    }
  };

  const resetForm = () => {
    setFormData({
      codigo_interno: '',
      nombre: '',
      descripcion: '',
      clave_sat: '',
      unidad_sat: 'H87',
      precio_unitario: 0,
      tipo: 'producto',
      categoria: '',
      cuenta_contable: ''
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold tracking-tight">Catálogo de Productos y Servicios</h3>
          <p className="text-muted-foreground">
            Gestiona tu catálogo con claves SAT integradas
          </p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={() => { resetForm(); setEditingProduct(null); }}>
              <Plus className="h-4 w-4" />
              Nuevo Producto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
              </DialogTitle>
              <DialogDescription>
                Completa la información del producto con las claves SAT correspondientes
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="codigo_interno">Código Interno</Label>
                  <Input
                    id="codigo_interno"
                    value={formData.codigo_interno}
                    onChange={(e) => setFormData({ ...formData, codigo_interno: e.target.value })}
                    placeholder="PROD001"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo</Label>
                  <Select value={formData.tipo} onValueChange={(value: 'producto' | 'servicio') => setFormData({ ...formData, tipo: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="producto">Producto</SelectItem>
                      <SelectItem value="servicio">Servicio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Nombre del producto o servicio"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder="Descripción detallada"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clave_sat">Clave SAT *</Label>
                  <SATKeySelector
                    type="product"
                    value={formData.clave_sat}
                    onValueChange={(value) => setFormData({ ...formData, clave_sat: value })}
                    placeholder="Seleccionar clave de producto SAT"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unidad_sat">Unidad SAT *</Label>
                  <SATKeySelector
                    type="unit"
                    value={formData.unidad_sat}
                    onValueChange={(value) => setFormData({ ...formData, unidad_sat: value })}
                    placeholder="Seleccionar unidad de medida SAT"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="precio_unitario">Precio Unitario</Label>
                  <Input
                    id="precio_unitario"
                    type="number"
                    step="0.01"
                    value={formData.precio_unitario}
                    onChange={(e) => setFormData({ ...formData, precio_unitario: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="categoria">Categoría</Label>
                  <Input
                    id="categoria"
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    placeholder="Categoría del producto"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cuenta_contable">Cuenta Contable</Label>
                <Input
                  id="cuenta_contable"
                  value={formData.cuenta_contable}
                  onChange={(e) => setFormData({ ...formData, cuenta_contable: e.target.value })}
                  placeholder="4010001"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingProduct ? 'Actualizar' : 'Crear'} Producto
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar productos por nombre, código, clave SAT o categoría..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Productos Registrados ({filteredProducts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Clave SAT</TableHead>
                <TableHead>Unidad</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Barcode className="h-4 w-4 text-muted-foreground" />
                      {product.codigo_interno}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{product.nombre}</p>
                      {product.categoria && (
                        <p className="text-sm text-muted-foreground">{product.categoria}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={product.tipo === 'producto' ? 'default' : 'secondary'}>
                      {product.tipo}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{product.clave_sat}</TableCell>
                  <TableCell className="font-mono text-sm">{product.unidad_sat}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3 text-muted-foreground" />
                      {formatCurrency(product.precio_unitario)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={product.activo ? 'default' : 'secondary'}>
                      {product.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(product)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(product.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}