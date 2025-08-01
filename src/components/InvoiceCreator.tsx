import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, FileText, Calculator, Search, User, Package } from 'lucide-react';

interface InvoiceItem {
  id: string;
  product_id: string;
  codigo_interno: string;
  nombre: string;
  clave_sat: string;
  unidad_sat: string;
  cantidad: number;
  precio_unitario: number;
  descuento: number;
  subtotal: number;
  iva: number;
  total: number;
}

interface Client {
  id: string;
  full_name: string;
  email: string;
  phone: string;
}

interface Product {
  id: string;
  codigo_interno: string;
  nombre: string;
  clave_sat: string;
  unidad_sat: string;
  precio_unitario: number;
}

interface InvoiceCreatorProps {
  onInvoiceCreated: () => void;
}

export function InvoiceCreator({ onInvoiceCreated }: InvoiceCreatorProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [searchProduct, setSearchProduct] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const { toast } = useToast();

  const [invoiceData, setInvoiceData] = useState({
    client_id: '',
    serie: 'FAC',
    metodo_pago: 'PUE',
    forma_pago: '99',
    uso_cfdi: 'G01',
    lugar_expedicion: '64000',
    condiciones_pago: '',
    observaciones: ''
  });

  const [totals, setTotals] = useState({
    subtotal: 0,
    descuento: 0,
    iva: 0,
    total: 0
  });

  useEffect(() => {
    fetchClients();
    fetchProducts();
  }, []);

  useEffect(() => {
    if (searchProduct.trim() === '') {
      setFilteredProducts([]);
    } else {
      const filtered = products.filter(product =>
        product.nombre.toLowerCase().includes(searchProduct.toLowerCase()) ||
        product.codigo_interno.toLowerCase().includes(searchProduct.toLowerCase()) ||
        product.clave_sat.includes(searchProduct)
      ).slice(0, 10);
      setFilteredProducts(filtered);
    }
  }, [searchProduct, products]);

  useEffect(() => {
    calculateTotals();
  }, [items]);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, full_name, email, phone')
        .order('full_name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products_services')
        .select('id, codigo_interno, nombre, clave_sat, unidad_sat, precio_unitario')
        .eq('activo', true)
        .order('nombre');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const addProduct = (product: Product) => {
    const existingItem = items.find(item => item.product_id === product.id);
    
    if (existingItem) {
      updateQuantity(existingItem.id, existingItem.cantidad + 1);
    } else {
      const newItem: InvoiceItem = {
        id: crypto.randomUUID(),
        product_id: product.id,
        codigo_interno: product.codigo_interno,
        nombre: product.nombre,
        clave_sat: product.clave_sat,
        unidad_sat: product.unidad_sat,
        cantidad: 1,
        precio_unitario: product.precio_unitario,
        descuento: 0,
        subtotal: product.precio_unitario,
        iva: product.precio_unitario * 0.16,
        total: product.precio_unitario * 1.16
      };
      setItems([...items, newItem]);
    }
    setSearchProduct('');
    setFilteredProducts([]);
  };

  const updateQuantity = (itemId: string, cantidad: number) => {
    if (cantidad <= 0) {
      removeItem(itemId);
      return;
    }

    setItems(items.map(item => {
      if (item.id === itemId) {
        const subtotal = item.precio_unitario * cantidad - item.descuento;
        const iva = subtotal * 0.16;
        const total = subtotal + iva;
        
        return {
          ...item,
          cantidad,
          subtotal,
          iva,
          total
        };
      }
      return item;
    }));
  };

  const updatePrice = (itemId: string, precio_unitario: number) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        const subtotal = precio_unitario * item.cantidad - item.descuento;
        const iva = subtotal * 0.16;
        const total = subtotal + iva;
        
        return {
          ...item,
          precio_unitario,
          subtotal,
          iva,
          total
        };
      }
      return item;
    }));
  };

  const removeItem = (itemId: string) => {
    setItems(items.filter(item => item.id !== itemId));
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const descuento = items.reduce((sum, item) => sum + item.descuento, 0);
    const iva = items.reduce((sum, item) => sum + item.iva, 0);
    const total = subtotal + iva;

    setTotals({ subtotal, descuento, iva, total });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (items.length === 0) {
      toast({
        title: 'Error',
        description: 'Debe agregar al menos un producto a la factura',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // Get next folio number
      const { data: seriesData } = await supabase
        .from('invoice_series')
        .select('folio_actual')
        .eq('serie', invoiceData.serie)
        .eq('tipo_comprobante', 'I')
        .single();

      const nextFolio = seriesData ? seriesData.folio_actual : 1;

      // Prepare invoice data
      const newInvoice = {
        serie: invoiceData.serie,
        folio: nextFolio.toString().padStart(6, '0'),
        tipo_comprobante: 'I',
        emisor_rfc: 'XAXX010101000',
        emisor_razon_social: 'Empresa Demo',
        emisor_regimen_fiscal: '601',
        receptor_rfc: 'XAXX010101000',
        receptor_razon_social: 'Cliente Demo',
        receptor_uso_cfdi: invoiceData.uso_cfdi,
        metodo_pago: invoiceData.metodo_pago,
        forma_pago: invoiceData.forma_pago,
        lugar_expedicion: invoiceData.lugar_expedicion,
        condiciones_pago: invoiceData.condiciones_pago,
        subtotal: totals.subtotal,
        total: totals.total,
        total_impuestos_trasladados: totals.iva,
        conceptos: items.map(item => ({
          cantidad: item.cantidad,
          unidad: item.unidad_sat,
          clave_sat: item.clave_sat,
          descripcion: item.nombre,
          valor_unitario: item.precio_unitario,
          importe: item.subtotal,
          descuento: item.descuento
        })),
        impuestos: {
          traslados: [{
            impuesto: '002',
            tipo_factor: 'Tasa',
            tasa_cuota: 0.16,
            base: totals.subtotal,
            importe: totals.iva
          }]
        },
        client_id: invoiceData.client_id || null,
        observaciones: invoiceData.observaciones,
        created_by: user.id
      };

      const { data, error } = await supabase
        .from('electronic_invoices')
        .insert([newInvoice])
        .select()
        .single();

      if (error) throw error;

      // Update series folio
      await supabase
        .from('invoice_series')
        .upsert({
          serie: invoiceData.serie,
          tipo_comprobante: 'I',
          folio_actual: nextFolio + 1,
          descripcion: 'Facturas de Ingreso',
          created_by: user.id
        });

      toast({
        title: 'Éxito',
        description: `Factura ${invoiceData.serie}-${nextFolio.toString().padStart(6, '0')} creada correctamente`
      });

      // Reset form
      setItems([]);
      setInvoiceData({
        client_id: '',
        serie: 'FAC',
        metodo_pago: 'PUE',
        forma_pago: '99',
        uso_cfdi: 'G01',
        lugar_expedicion: '64000',
        condiciones_pago: '',
        observaciones: ''
      });

      onInvoiceCreated();
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast({
        title: 'Error',
        description: 'Error al crear la factura',
        variant: 'destructive'
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <FileText className="h-6 w-6" />
        <h3 className="text-2xl font-bold tracking-tight">Crear Nueva Factura</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Invoice Header */}
        <Card>
          <CardHeader>
            <CardTitle>Datos de la Factura</CardTitle>
            <CardDescription>
              Información general de la factura electrónica
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="client_id">Cliente</Label>
                <Select value={invoiceData.client_id} onValueChange={(value) => setInvoiceData({ ...invoiceData, client_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {client.full_name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="metodo_pago">Método de Pago</Label>
                <Select value={invoiceData.metodo_pago} onValueChange={(value) => setInvoiceData({ ...invoiceData, metodo_pago: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PUE">PUE - Pago en una sola exhibición</SelectItem>
                    <SelectItem value="PPD">PPD - Pago en parcialidades o diferido</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="uso_cfdi">Uso CFDI</Label>
                <Select value={invoiceData.uso_cfdi} onValueChange={(value) => setInvoiceData({ ...invoiceData, uso_cfdi: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="G01">G01 - Adquisición de mercancías</SelectItem>
                    <SelectItem value="G02">G02 - Devoluciones, descuentos o bonificaciones</SelectItem>
                    <SelectItem value="G03">G03 - Gastos en general</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4">
              <Label htmlFor="observaciones">Observaciones</Label>
              <Textarea
                id="observaciones"
                value={invoiceData.observaciones}
                onChange={(e) => setInvoiceData({ ...invoiceData, observaciones: e.target.value })}
                placeholder="Observaciones adicionales..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Product Search */}
        <Card>
          <CardHeader>
            <CardTitle>Agregar Productos</CardTitle>
            <CardDescription>
              Busca y agrega productos a la factura
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar productos por nombre, código o clave SAT..."
                value={searchProduct}
                onChange={(e) => setSearchProduct(e.target.value)}
                className="pl-8"
              />
              {filteredProducts.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg">
                  {filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                      onClick={() => addProduct(product)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{product.nombre}</p>
                          <p className="text-sm text-muted-foreground">
                            {product.codigo_interno} | {product.clave_sat}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {formatCurrency(product.precio_unitario)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Invoice Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Conceptos de la Factura
              <Badge variant="outline">
                {items.length} productos
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay productos agregados</p>
                <p className="text-sm">Busca y agrega productos usando el campo de búsqueda</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead>Subtotal</TableHead>
                    <TableHead>IVA</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.nombre}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.codigo_interno} | {item.clave_sat}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          value={item.cantidad}
                          onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.precio_unitario}
                          onChange={(e) => updatePrice(item.id, parseFloat(e.target.value) || 0)}
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>{formatCurrency(item.subtotal)}</TableCell>
                      <TableCell>{formatCurrency(item.iva)}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(item.total)}</TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Totals */}
        {items.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Totales de la Factura
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>IVA (16%):</span>
                  <span>{formatCurrency(totals.iva)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>{formatCurrency(totals.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit */}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline">
            Cancelar
          </Button>
          <Button type="submit" disabled={items.length === 0}>
            <FileText className="h-4 w-4 mr-2" />
            Crear Factura
          </Button>
        </div>
      </form>
    </div>
  );
}