import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Book, Search, Download, ExternalLink, FileText, Filter, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import { openDocumentInNewTab, downloadDocument } from '@/lib/documentUtils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface Manual {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  category: string | null;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
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
      const { data, error } = await supabase
        .from('operation_manuals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching manuals:', error);
        return;
      }

      setManuals(data || []);
    } catch (error) {
      console.error('Error fetching manuals:', error);
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

  const getFileIcon = (mimeType: string | null) => {
    if (!mimeType) return FileText;
    if (mimeType.includes('pdf')) return FileText;
    if (mimeType.includes('word')) return FileText;
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return FileText;
    return FileText;
  };

  const handleViewDocument = async (manual: Manual) => {
    try {
      const result = await openDocumentInNewTab(manual.file_url, 'operation_manual');
      if (result.success) {
        let description = "El manual se ha abierto en una nueva pestaña.";
        
        // Mostrar información específica sobre fallbacks usados
        if (result.fallbackUsed === 'download') {
          description = "El navegador bloqueó la apertura automática. El manual se ha descargado.";
        } else if (result.fallbackUsed === 'alternative_window_params') {
          description = "El manual se abrió usando parámetros alternativos de ventana.";
        } else if (result.error) {
          description = result.error;
        }
        
        toast({
          title: "Manual procesado",
          description,
          variant: result.fallbackUsed ? "default" : "default"
        });
      } else {
        throw new Error(result.error || 'No se pudo abrir el manual');
      }
    } catch (error) {
      console.error('Error opening manual:', error);
      toast({
        title: "Error al abrir manual",
        description: error instanceof Error ? error.message : "No se pudo abrir el manual.",
        variant: "destructive"
      });
    }
  };

  const handleDownloadDocument = async (manual: Manual) => {
    try {
      const result = await downloadDocument(manual.file_url, manual.title + '.pdf', 'operation_manual');
      if (result.success) {
        toast({
          title: "Descarga iniciada",
          description: "El manual se está descargando.",
        });
      } else {
        throw new Error(result.error || 'No se pudo descargar el manual');
      }
    } catch (error) {
      console.error('Error downloading manual:', error);
      toast({
        title: "Error al descargar",
        description: error instanceof Error ? error.message : "No se pudo descargar el manual.",
        variant: "destructive"
      });
    }
  };

  const getCategoryColor = (category: string | null) => {
    const colors: Record<string, string> = {
      'Procedimientos': 'bg-blue-100 text-blue-800',
      'Seguridad': 'bg-red-100 text-red-800',
      'Recursos Humanos': 'bg-green-100 text-green-800',
      'Calidad': 'bg-purple-100 text-purple-800',
      'Técnico': 'bg-orange-100 text-orange-800',
      'Administrativo': 'bg-gray-100 text-gray-800',
      'General': 'bg-indigo-100 text-indigo-800'
    };
    return colors[category || 'General'] || 'bg-gray-100 text-gray-800';
  };

  const deleteManual = async (manual: Manual) => {
    try {
      // First, delete the file from storage if it exists
      if (manual.file_url) {
        const fileName = manual.file_url.split('/').pop();
        if (fileName) {
          const { error: storageError } = await supabase.storage
            .from('operation-manuals')
            .remove([`manuals/${fileName}`]);
          
          if (storageError) {
            console.error('Error deleting file from storage:', storageError);
            // Continue with database deletion even if storage deletion fails
          }
        }
      }

      // Delete the manual record from the database
      const { error: dbError } = await supabase
        .from('operation_manuals')
        .delete()
        .eq('id', manual.id);

      if (dbError) {
        throw dbError;
      }

      toast({
        title: "Manual eliminado",
        description: `El manual "${manual.title}" ha sido eliminado exitosamente.`,
      });

      // Refresh the manuals list
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
              {filteredManuals.map((manual) => {
                const FileIcon = getFileIcon(manual.mime_type);
                
                return (
                  <div
                    key={manual.id}
                    className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <div className="p-2 bg-info/20 rounded-lg">
                      <FileIcon className="h-5 w-5 text-info" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium text-sm truncate">{manual.title}</h4>
                          {manual.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                              {manual.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            {manual.category && (
                              <Badge 
                                variant="secondary" 
                                className={`text-xs ${getCategoryColor(manual.category)}`}
                              >
                                {manual.category}
                              </Badge>
                            )}
                            {manual.file_size && (
                              <span className="text-xs text-muted-foreground">
                                {formatFileSize(manual.file_size)}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-1 ml-2">
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="h-8 px-2"
                          >
                            <a 
                              href={manual.file_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </Button>
                          <Button
                            onClick={() => handleDownloadDocument(manual)}
                            variant="outline"
                            size="sm"
                            className="h-8 px-2"
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                          {isAdmin && showDeleteButton && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>¿Eliminar manual?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta acción eliminará permanentemente el manual "{manual.title}" 
                                    y no se podrá recuperar. ¿Estás seguro de que deseas continuar?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteManual(manual)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Eliminar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
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