import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Book, Search, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import { listCompanyManuals, signCompanyManual, type ManualItem } from '@/modules/manuals/companyManualsAdapter';
import { ManualItem as ManualItemComponent } from './ManualItem';

interface Manual extends ManualItem {
  title: string;
  description?: string | null;
  file_url?: string;
  mime_type?: string | null;
  file_size?: number | null;
}

const CATEGORIES = [
  'Procedimientos',
  'Seguridad',
  'Recursos Humanos',
  'Calidad',
  'Técnico',
  'Administrativo',
  'General'
];

interface OperationManualsProps {
  showDeleteButton?: boolean;
}

export function OperationManuals({ showDeleteButton = false }: OperationManualsProps) {
  const [manuals, setManuals] = useState<Manual[]>([]);
  const [filteredManuals, setFilteredManuals] = useState<Manual[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { isAdmin } = useUserRole();

  useEffect(() => {
    fetchManuals();
  }, []);

  useEffect(() => {
    filterManuals();
  }, [manuals, searchTerm, selectedCategory]);

  const fetchManuals = async () => {
    try {
      setLoading(true);
      const items = await listCompanyManuals("manuals/");
      
      const mappedManuals: Manual[] = items.map(item => ({
        ...item,
        id: item.id || item.name,
        title: item.name.replace(/\.(pdf|ppt|pptx)$/i, ''),
        description: null,
        file_url: item.path,
        file_size: item.size,
        mime_type: item.name.endsWith('.pdf') ? 'application/pdf' : 
                   item.name.match(/\.(ppt|pptx)$/i) ? 'application/vnd.ms-powerpoint' : null,
      }));
      
      setManuals(mappedManuals);
    } catch (error) {
      console.error('Error fetching manuals:', error);
      toast({
        title: "Error al cargar manuales",
        description: "No se pudieron cargar los manuales. Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterManuals = () => {
    let filtered = manuals;

    if (searchTerm) {
      filtered = filtered.filter(manual =>
        manual.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        manual.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        manual.category?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter(manual => manual.category === selectedCategory);
    }

    setFilteredManuals(filtered);
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleDownloadDocument = async (manual: Manual) => {
    try {
      const url = await signCompanyManual(manual.path);
      const link = document.createElement('a');
      link.href = url;
      link.download = manual.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Descarga iniciada",
        description: "El manual se está descargando.",
      });
    } catch (error) {
      console.error('Error downloading manual:', error);
      toast({
        title: "Error al descargar",
        description: error instanceof Error ? error.message : "No se pudo descargar el manual.",
        variant: "destructive"
      });
    }
  };

  const deleteManual = async (manual: Manual) => {
    try {
      const { error: storageError } = await supabase.storage
        .from('operation-manuals')
        .remove([manual.path]);
      
      if (storageError) {
        throw storageError;
      }

      toast({
        title: "Manual eliminado",
        description: `El manual "${manual.title}" ha sido eliminado exitosamente.`,
      });

      await fetchManuals();
    } catch (error) {
      console.error('Error deleting manual:', error);
      toast({
        title: "Error al eliminar manual",
        description: "No se pudo eliminar el manual. Por favor, intenta de nuevo.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card className="glassmorphic-bg border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Book className="h-5 w-5 text-info" />
            Manuales de Operación
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center space-x-3 p-3 border rounded-lg animate-pulse">
                <div className="w-8 h-8 bg-muted rounded"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="glassmorphic-bg border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Book className="h-5 w-5 text-info" />
            Manuales de Operación
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar manuales..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex gap-2">
              <Select value={selectedCategory || "all"} onValueChange={(value) => setSelectedCategory(value === "all" ? null : value)}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Manuals List */}
          {filteredManuals.length === 0 ? (
            <div className="text-center py-12">
              <Book className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                {manuals.length === 0 ? 'No hay manuales disponibles' : 'No se encontraron manuales'}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {manuals.length === 0 
                  ? 'Los manuales de operación aparecerán aquí' 
                  : 'Intenta ajustar los filtros de búsqueda'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredManuals.map((manual) => (
                <ManualItemComponent
                  key={manual.id}
                  manual={manual}
                  onDownload={handleDownloadDocument}
                  onDelete={deleteManual}
                  showDeleteButton={showDeleteButton}
                  isAdmin={isAdmin}
                />
              ))}
            </div>
          )}

          {/* Results count */}
          {manuals.length > 0 && (
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                {filteredManuals.length === manuals.length 
                  ? `${manuals.length} manual${manuals.length !== 1 ? 'es' : ''} disponible${manuals.length !== 1 ? 's' : ''}`
                  : `${filteredManuals.length} de ${manuals.length} manuales`
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

    </>
  );
}