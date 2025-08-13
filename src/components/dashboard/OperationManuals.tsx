import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Book, Search, Download, ExternalLink, Edit, Plus, FileText, Filter, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ManualUploader } from './AdminPanels/ManualUploader';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
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

export function OperationManuals() {
  const [manuals, setManuals] = useState<Manual[]>([]);
  const [filteredManuals, setFilteredManuals] = useState<Manual[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showUploader, setShowUploader] = useState(false);
  const [loading, setLoading] = useState(true);
  const { hasModuleAccess } = usePermissions();
  const { toast } = useToast();
  
  // If user can access this module, they are admin
  const isAdmin = true;

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

  const openFile = (url: string, newTab = false) => {
    if (newTab) {
      window.open(url, '_blank');
    } else {
      const link = document.createElement('a');
      link.href = url;
      link.download = '';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Book className="h-5 w-5 text-info" />
            Manuales de Operación
          </CardTitle>
          {isAdmin && (
            <Button
              onClick={() => setShowUploader(true)}
              variant="outline"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              Subir Manual
            </Button>
          )}
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
              {isAdmin && manuals.length === 0 && (
                <Button
                  onClick={() => setShowUploader(true)}
                  variant="outline"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Subir primer manual
                </Button>
              )}
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
                            onClick={() => openFile(manual.file_url, true)}
                            variant="outline"
                            size="sm"
                            className="h-8 px-2"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                          <Button
                            onClick={() => openFile(manual.file_url, false)}
                            variant="outline"
                            size="sm"
                            className="h-8 px-2"
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                          {isAdmin && (
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

      {showUploader && (
        <ManualUploader
          open={showUploader}
          onOpenChange={setShowUploader}
          onManualUploaded={fetchManuals}
        />
      )}
    </>
  );
}