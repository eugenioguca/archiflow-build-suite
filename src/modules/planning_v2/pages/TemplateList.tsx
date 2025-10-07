/**
 * TemplateList - Planning v2
 * Lista de plantillas disponibles
 */

import { useState, useEffect } from 'react';
import { Plus, FileText, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useTemplate } from '../hooks/useTemplate';
import { useNavigate } from 'react-router-dom';

export function TemplateList() {
  const navigate = useNavigate();
  const { templates, isLoading, deleteTemplate, isDeleting } = useTemplate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // Cleanup on unmount to prevent stuck overlays
  useEffect(() => {
    return () => {
      setDeleteDialogOpen(false);
      setSelectedTemplateId(null);
    };
  }, []);

  const handleDelete = async () => {
    if (selectedTemplateId) {
      try {
        // 1. Close dialog first
        setDeleteDialogOpen(false);
        setSelectedTemplateId(null);
        
        // 2. Execute delete
        await deleteTemplate(selectedTemplateId);
      } catch (error) {
        // Error is handled by the hook
        console.error('Delete error:', error);
      } finally {
        // Ensure dialog closes even on error
        setDeleteDialogOpen(false);
        setSelectedTemplateId(null);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Cargando plantillas...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Plantillas de Presupuesto</h1>
          <p className="text-muted-foreground">
            Define estructuras reutilizables para tus presupuestos
          </p>
        </div>
        <Button onClick={() => navigate('/planning-v2/templates/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Plantilla
        </Button>
      </div>

      {/* Templates Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(templates || []).map((template) => (
          <Card key={template.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {template.name}
                  </CardTitle>
                  {template.is_main && (
                    <Badge variant="outline" className="mt-2">
                      Principal
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {template.description || 'Sin descripción'}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => navigate(`/planning-v2/templates/${template.id}`)}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTemplateId(template.id);
                    setDeleteDialogOpen(true);
                  }}
                  disabled={isDeleting}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {!templates || templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay plantillas</h3>
            <p className="text-muted-foreground mb-4">
              Crea tu primera plantilla para empezar
            </p>
            <Button onClick={() => navigate('/planning-v2/templates/new')}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Plantilla
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Delete Dialog - Controlled */}
      <AlertDialog 
        open={deleteDialogOpen} 
        onOpenChange={(open) => {
          if (!isDeleting) {
            setDeleteDialogOpen(open);
            if (!open) setSelectedTemplateId(null);
          }
        }}
      >
        <AlertDialogContent
          onEscapeKeyDown={(e) => {
            if (isDeleting) {
              e.preventDefault();
            }
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar plantilla?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminarán todas las partidas,
              conceptos y pruebas asociadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
