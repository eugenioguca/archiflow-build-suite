import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, ExternalLink, FileText, Trash2, AlertCircle } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSignedUrlRotating } from '@/modules/manuals/useSignedUrlRotating';
import { getCompanyManualBucket, type ManualItem as ManualItemType } from '@/modules/manuals/companyManualsAdapter';

interface Manual extends ManualItemType {
  title: string;
  description?: string | null;
  file_url?: string;
  mime_type?: string | null;
  file_size?: number | null;
}

interface ManualItemProps {
  manual: Manual;
  onDownload: (manual: Manual) => void;
  onDelete?: (manual: Manual) => void;
  showDeleteButton: boolean;
  isAdmin: boolean;
}

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

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return '';
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

export function ManualItem({ manual, onDownload, onDelete, showDeleteButton, isAdmin }: ManualItemProps) {
  const { url: signedUrl, loading, error, refresh } = useSignedUrlRotating({
    bucket: getCompanyManualBucket(),
    path: manual.path,
    ttlSec: 900, // 15 min
    refreshSec: 720, // 12 min (80% of ttl)
  });

  return (
    <TooltipProvider>
      <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors">
        <div className="p-2 bg-info/20 rounded-lg">
          {error ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertCircle className="h-5 w-5 text-destructive" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">No se pudo generar enlace. Intenta de nuevo.</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <FileText className="h-5 w-5 text-info" />
          )}
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
                asChild={!!signedUrl}
                variant="outline"
                size="sm"
                onClick={(e) => {
                  if (!signedUrl) {
                    e.preventDefault();
                    refresh();
                  }
                }}
                disabled={loading}
                title={signedUrl ? 'Abrir en nueva pestaña' : 'Generando enlace…'}
                aria-disabled={!signedUrl}
                className="h-8 px-2"
              >
                {signedUrl ? (
                  <a
                    href={signedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <ExternalLink className="h-3 w-3" />
                )}
              </Button>
              <Button
                onClick={() => onDownload(manual)}
                variant="outline"
                size="sm"
                className="h-8 px-2"
              >
                <Download className="h-3 w-3" />
              </Button>
              {isAdmin && showDeleteButton && onDelete && (
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
                        onClick={() => onDelete(manual)}
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
    </TooltipProvider>
  );
}
