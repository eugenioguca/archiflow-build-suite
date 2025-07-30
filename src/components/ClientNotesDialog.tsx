import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { Plus, User, Clock } from "lucide-react";

interface Note {
  id: string;
  content: string;
  created_at: string;
  created_by: string;
  author_name?: string;
}

interface ClientNotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
}

export function ClientNotesDialog({ open, onOpenChange, clientId, clientName }: ClientNotesDialogProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (open && clientId) {
      fetchNotes();
    }
  }, [open, clientId]);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('crm_activities')
        .select(`
          id,
          description,
          created_at,
          user_id
        `)
        .eq('client_id', clientId)
        .eq('activity_type', 'follow_up')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedNotes = data?.map(note => ({
        id: note.id,
        content: note.description || '',
        created_at: note.created_at,
        created_by: note.user_id,
        author_name: 'Usuario'
      })) || [];

      setNotes(formattedNotes);
    } catch (error) {
      console.error('Error fetching notes:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las notas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addNote = async () => {
    if (!newNote.trim() || !user?.id) return;

    try {
      setIsAdding(true);
      const { error } = await supabase
        .from('crm_activities')
        .insert({
          client_id: clientId,
          user_id: user.id,
          activity_type: 'follow_up',
          title: 'Nota del cliente',
          description: newNote.trim(),
        });

      if (error) throw error;

      setNewNote("");
      await fetchNotes();
      
      toast({
        title: "Nota agregada",
        description: "La nota se ha guardado correctamente",
      });
    } catch (error) {
      console.error('Error adding note:', error);
      toast({
        title: "Error",
        description: "No se pudo agregar la nota",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-background/95 backdrop-blur-xl border border-border/50">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-foreground">
            Notas de {clientName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add new note */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">Agregar nueva nota</label>
            <Textarea
              placeholder="Escribe tu nota aquí..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="min-h-[100px]"
            />
            <Button 
              onClick={addNote} 
              disabled={!newNote.trim() || isAdding}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              {isAdding ? "Guardando..." : "Agregar Nota"}
            </Button>
          </div>

          {/* Notes list */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground">Historial de Notas</h3>
            
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Cargando notas...
              </div>
            ) : notes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay notas registradas para este cliente
              </div>
            ) : (
              <div className="space-y-3">
                {notes.map((note) => (
                  <div 
                    key={note.id} 
                    className="p-4 rounded-lg border border-border/50 bg-card/50 backdrop-blur-sm"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="w-4 h-4" />
                        <span>{note.author_name || 'Usuario'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>
                          {format(new Date(note.created_at), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}
                        </span>
                      </div>
                    </div>
                    <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                      {note.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}