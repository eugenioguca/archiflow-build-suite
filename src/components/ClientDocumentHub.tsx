import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Search, Filter, Calendar, Download, Eye } from 'lucide-react';
import { ClientFiscalDocuments } from './ClientFiscalDocuments';
import { DesignDocumentsViewer } from './DesignDocumentsViewer';
import { ProgressPhotosCarousel } from './ProgressPhotosCarousel';
import { ClientInvoiceViewer } from './ClientInvoiceViewer';
import { ClientPaymentProofUploader } from './ClientPaymentProofUploader';

interface ClientDocumentHubProps {
  clientId: string;
  projectId: string;
}

interface DocumentStats {
  fiscal: number;
  design: number;
  invoices: number;
  paymentProofs: number;
  photos: number;
}

export const ClientDocumentHub = ({ clientId, projectId }: ClientDocumentHubProps) => {
  const [activeTab, setActiveTab] = useState('fiscal');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [stats, setStats] = useState<DocumentStats>({
    fiscal: 0,
    design: 0,
    invoices: 0,
    paymentProofs: 0,
    photos: 0
  });

  // Esta función se podría usar para obtener estadísticas reales de cada tipo de documento
  useEffect(() => {
    // Placeholder para futuras estadísticas en tiempo real
    setStats({
      fiscal: 0,
      design: 0,
      invoices: 0,
      paymentProofs: 0,
      photos: 0
    });
  }, [clientId, projectId]);

  const documentTypes = [
    {
      id: 'fiscal',
      label: 'Documentos Fiscales',
      count: stats.fiscal,
      icon: FileText,
      description: 'RFC, constancias y documentos fiscales'
    },
    {
      id: 'design',
      label: 'Documentos de Diseño',
      count: stats.design,
      icon: FileText,
      description: 'Planos, renders y documentos del proyecto'
    },
    {
      id: 'payments',
      label: 'Comprobantes de Pago',
      count: stats.paymentProofs,
      icon: FileText,
      description: 'Comprobantes y evidencias de pagos'
    },
    {
      id: 'invoices',
      label: 'Facturas Electrónicas',
      count: stats.invoices,
      icon: FileText,
      description: 'Facturas generadas para el proyecto'
    },
    {
      id: 'photos',
      label: 'Fotos de Avance',
      count: stats.photos,
      icon: FileText,
      description: 'Fotografías del progreso de construcción'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header with Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Centro de Documentos
            </CardTitle>
            <Badge variant="outline" className="text-sm">
              {Object.values(stats).reduce((a, b) => a + b, 0)} documentos
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar documentos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por fecha" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las fechas</SelectItem>
                <SelectItem value="today">Hoy</SelectItem>
                <SelectItem value="week">Esta semana</SelectItem>
                <SelectItem value="month">Este mes</SelectItem>
                <SelectItem value="quarter">Este trimestre</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Document Type Overview */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {documentTypes.map((type) => {
              const Icon = type.icon;
              return (
                <Card 
                  key={type.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    activeTab === type.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setActiveTab(type.id)}
                >
                  <CardContent className="p-4 text-center">
                    <Icon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="font-medium text-sm">{type.label}</p>
                    <Badge variant="secondary" className="mt-1">
                      {type.count}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {type.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Document Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="fiscal">Fiscales</TabsTrigger>
          <TabsTrigger value="design">Diseño</TabsTrigger>
          <TabsTrigger value="payments">Pagos</TabsTrigger>
          <TabsTrigger value="invoices">Facturas</TabsTrigger>
          <TabsTrigger value="photos">Fotos</TabsTrigger>
        </TabsList>

        <TabsContent value="fiscal" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Documentos Fiscales</CardTitle>
            </CardHeader>
            <CardContent>
              <ClientFiscalDocuments 
                clientId={clientId} 
                projectId={projectId}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="design" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Documentos de Diseño</CardTitle>
            </CardHeader>
            <CardContent>
              <DesignDocumentsViewer 
                projectId={projectId}
                clientId={clientId}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Comprobantes de Pago</CardTitle>
            </CardHeader>
            <CardContent>
              <ClientPaymentProofUploader
                clientId={clientId}
                projectId={projectId}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Facturas Electrónicas</CardTitle>
            </CardHeader>
            <CardContent>
              <ClientInvoiceViewer
                clientId={clientId}
                projectId={projectId}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="photos" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Fotos de Avance de Construcción</CardTitle>
            </CardHeader>
            <CardContent>
              <ProgressPhotosCarousel
                photos={[]}
                onPhotoDownload={(photo) => console.log('Download photo:', photo)}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};