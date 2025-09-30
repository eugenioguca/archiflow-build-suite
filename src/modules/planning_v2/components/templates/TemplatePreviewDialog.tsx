/**
 * Dialog to preview template before applying with TU mapping info
 */
import { useMemo } from 'react';
import { AlertCircle, CheckCircle2, XCircle, Info } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TemplatePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  templateName: string;
  partidas: Array<{ code: string; name: string }>;
  conceptos: Array<{ partida_code: string; code: string; short_description: string; unit: string }>;
  unmappedPartidas: string[];
  unmappedConceptos: string[];
  isApplying: boolean;
}

export function TemplatePreviewDialog({
  open,
  onOpenChange,
  onConfirm,
  templateName,
  partidas,
  conceptos,
  unmappedPartidas,
  unmappedConceptos,
  isApplying
}: TemplatePreviewDialogProps) {
  const stats = useMemo(() => {
    const partidasByCodigo = new Map<string, typeof conceptos>();
    conceptos.forEach(c => {
      if (!partidasByCodigo.has(c.partida_code)) {
        partidasByCodigo.set(c.partida_code, []);
      }
      partidasByCodigo.get(c.partida_code)!.push(c);
    });
    
    return {
      totalPartidas: partidas.length,
      mappedPartidas: partidas.length - unmappedPartidas.length,
      totalConceptos: conceptos.length,
      mappedConceptos: conceptos.length - unmappedConceptos.length,
      partidasWithConceptos: Array.from(partidasByCodigo.entries()).map(([code, concepts]) => ({
        partida: partidas.find(p => p.code === code),
        conceptCount: concepts.length
      }))
    };
  }, [partidas, conceptos, unmappedPartidas, unmappedConceptos]);
  
  const hasUnmapped = unmappedPartidas.length > 0 || unmappedConceptos.length > 0;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Vista Previa: {templateName}</DialogTitle>
          <DialogDescription>
            Revisa la estructura antes de aplicar la plantilla
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Stats Overview */}
          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold">{stats.totalPartidas}</div>
              <div className="text-sm text-muted-foreground">Partidas</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.mappedPartidas}</div>
              <div className="text-sm text-muted-foreground">Mapeadas</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold">{stats.totalConceptos}</div>
              <div className="text-sm text-muted-foreground">Conceptos</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.mappedConceptos}</div>
              <div className="text-sm text-muted-foreground">Mapeados</div>
            </div>
          </div>
          
          {/* Unmapped Warning */}
          {hasUnmapped && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Hay {unmappedPartidas.length + unmappedConceptos.length} elementos sin mapear a TU.
                Se crearán de todos modos, pero no tendrán vinculación con el catálogo TU.
              </AlertDescription>
            </Alert>
          )}
          
          {/* Success Info */}
          {!hasUnmapped && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Todos los elementos están mapeados correctamente al catálogo TU.
              </AlertDescription>
            </Alert>
          )}
          
          <Tabs defaultValue="structure" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="structure">
                Estructura ({stats.totalPartidas})
              </TabsTrigger>
              <TabsTrigger value="unmapped">
                No Mapeados ({unmappedPartidas.length + unmappedConceptos.length})
              </TabsTrigger>
              <TabsTrigger value="conceptos">
                Conceptos ({stats.totalConceptos})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="structure" className="space-y-2">
              <ScrollArea className="h-[400px] rounded-md border p-4">
                <div className="space-y-4">
                  {stats.partidasWithConceptos.map(({ partida, conceptCount }) => (
                    partida && (
                      <div key={partida.code} className="space-y-1">
                        <div className="flex items-center gap-2 p-2 bg-primary/5 rounded">
                          <Badge variant="secondary" className="font-mono">
                            {partida.code}
                          </Badge>
                          <span className="flex-1 font-medium">{partida.name}</span>
                          <Badge variant="outline">
                            {conceptCount} conceptos
                          </Badge>
                        </div>
                      </div>
                    )
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="unmapped" className="space-y-2">
              <ScrollArea className="h-[400px] rounded-md border p-4">
                {unmappedPartidas.length === 0 && unmappedConceptos.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-600" />
                    <p>No hay elementos sin mapear</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {unmappedPartidas.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-destructive" />
                          Partidas sin mapear ({unmappedPartidas.length})
                        </h4>
                        <div className="space-y-1">
                          {unmappedPartidas.map((p, i) => (
                            <div key={i} className="text-sm text-muted-foreground p-2 border rounded">
                              {p}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {unmappedConceptos.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-destructive" />
                          Conceptos sin mapear ({unmappedConceptos.length})
                        </h4>
                        <div className="space-y-1">
                          {unmappedConceptos.map((c, i) => (
                            <div key={i} className="text-xs text-muted-foreground p-2 border rounded">
                              {c}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        Los elementos sin mapear se crearán en el presupuesto con cantidad en 0.
                        Puedes editarlos manualmente o usar "Ocultar en cero" para ocultarlos.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="conceptos" className="space-y-2">
              <ScrollArea className="h-[400px] rounded-md border p-4">
                <div className="space-y-1">
                  {conceptos.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded hover:bg-muted/30 text-xs">
                      <Badge variant="secondary" className="font-mono text-[10px]">
                        {c.code}
                      </Badge>
                      <span className="flex-1 truncate">{c.short_description}</span>
                      <Badge variant="outline" className="text-[10px]">{c.unit}</Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isApplying}
          >
            Cancelar
          </Button>
          <Button onClick={onConfirm} disabled={isApplying}>
            {isApplying ? 'Aplicando...' : 'Aplicar Plantilla'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
