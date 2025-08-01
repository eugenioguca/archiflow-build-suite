import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Plus, Edit2, Trash2, Download, Copy } from "lucide-react";

interface ContractTemplate {
  id: string;
  name: string;
  template_type: string;
  content: string;
  is_active: boolean;
  created_at: string;
}

interface ContractTemplateManagerProps {
  clientId?: string;
  clientData?: any;
}

export function ContractTemplateManager({ clientId, clientData }: ContractTemplateManagerProps) {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);
  const [previewContent, setPreviewContent] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    template_type: "diseño",
    content: ""
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('contract_templates')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las plantillas de contratos",
        variant: "destructive",
      });
    }
  };

  const saveTemplate = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const templateData = {
        ...formData,
        created_by: user.id
      };

      if (selectedTemplate) {
        // Update existing template
        const { error } = await supabase
          .from('contract_templates')
          .update(templateData)
          .eq('id', selectedTemplate.id);

        if (error) throw error;
      } else {
        // Create new template
        const { error } = await supabase
          .from('contract_templates')
          .insert([templateData]);

        if (error) throw error;
      }

      await fetchTemplates();
      resetForm();
      setIsCreateDialogOpen(false);
      setIsEditDialogOpen(false);

      toast({
        title: "Éxito",
        description: selectedTemplate ? "Plantilla actualizada correctamente" : "Plantilla creada correctamente",
      });
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar la plantilla",
        variant: "destructive",
      });
    }
  };

  const deleteTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from('contract_templates')
        .update({ is_active: false })
        .eq('id', templateId);

      if (error) throw error;

      await fetchTemplates();
      toast({
        title: "Éxito",
        description: "Plantilla eliminada correctamente",
      });
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la plantilla",
        variant: "destructive",
      });
    }
  };

  const generateContractFromTemplate = (template: ContractTemplate) => {
    if (!clientData) {
      toast({
        title: "Error",
        description: "No hay datos del cliente disponibles",
        variant: "destructive",
      });
      return;
    }

    // Replace variables in template with client data
    let content = template.content;
    const variables = {
      '{{cliente_nombre}}': clientData.full_name || '[NOMBRE CLIENTE]',
      '{{cliente_email}}': clientData.email || '[EMAIL CLIENTE]',
      '{{cliente_telefono}}': clientData.phone || '[TELÉFONO CLIENTE]',
      '{{cliente_direccion}}': clientData.address || '[DIRECCIÓN CLIENTE]',
      '{{cliente_curp}}': clientData.curp || '[CURP CLIENTE]',
      '{{fecha_actual}}': new Date().toLocaleDateString('es-MX'),
      '{{servicio_tipo}}': clientData.service_type || 'diseño',
      '{{proyecto_valor}}': clientData.estimated_value ? `$${clientData.estimated_value.toLocaleString()}` : '[VALOR PROYECTO]',
      '{{proyecto_timeline}}': clientData.timeline_months ? `${clientData.timeline_months} meses` : '[TIMELINE PROYECTO]'
    };

    // Replace all variables
    Object.entries(variables).forEach(([variable, value]) => {
      content = content.replace(new RegExp(variable, 'g'), value);
    });

    setPreviewContent(content);
    setIsPreviewDialogOpen(true);
  };

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: "Copiado",
      description: "Contrato copiado al portapapeles",
    });
  };

  const resetForm = () => {
    setFormData({
      name: "",
      template_type: "diseño",
      content: ""
    });
    setSelectedTemplate(null);
  };

  const openEditDialog = (template: ContractTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      template_type: template.template_type,
      content: template.content
    });
    setIsEditDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Gestión de Contratos
          </CardTitle>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Plantilla
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Crear Nueva Plantilla de Contrato</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nombre de la Plantilla</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ej: Contrato de Diseño Estándar"
                    />
                  </div>
                  <div>
                    <Label htmlFor="template_type">Tipo de Servicio</Label>
                    <Select 
                      value={formData.template_type} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, template_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="diseño">Diseño</SelectItem>
                        <SelectItem value="construccion">Construcción</SelectItem>
                        <SelectItem value="diseño_construccion">Diseño + Construcción</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="content">Contenido del Contrato</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Escriba el contenido del contrato. Use variables como {{cliente_nombre}}, {{cliente_email}}, {{fecha_actual}}, etc."
                    rows={15}
                    className="font-mono text-sm"
                  />
                  <div className="mt-2 text-sm text-muted-foreground">
                    <p><strong>Variables disponibles:</strong></p>
                    <p>{'{{cliente_nombre}}'}, {'{{cliente_email}}'}, {'{{cliente_telefono}}'}, {'{{cliente_direccion}}'}, {'{{cliente_curp}}'}, {'{{fecha_actual}}'}, {'{{servicio_tipo}}'}, {'{{proyecto_valor}}'}, {'{{proyecto_timeline}}'}</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={saveTemplate}>
                    Guardar Plantilla
                  </Button>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {templates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No hay plantillas de contratos</p>
            <p className="text-sm">Crea una plantilla para generar contratos personalizados</p>
          </div>
        ) : (
          <div className="space-y-4">
            {templates.map((template) => (
              <div key={template.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">{template.name}</h4>
                    <Badge variant="outline">{template.template_type}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Creado el {new Date(template.created_at).toLocaleDateString('es-MX')}
                  </p>
                </div>
                
                <div className="flex gap-2">
                  {clientData && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => generateContractFromTemplate(template)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Generar
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(template)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteTemplate(template.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Plantilla de Contrato</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_name">Nombre de la Plantilla</Label>
                <Input
                  id="edit_name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit_template_type">Tipo de Servicio</Label>
                <Select 
                  value={formData.template_type} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, template_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="diseño">Diseño</SelectItem>
                    <SelectItem value="construccion">Construcción</SelectItem>
                    <SelectItem value="diseño_construccion">Diseño + Construcción</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="edit_content">Contenido del Contrato</Label>
              <Textarea
                id="edit_content"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                rows={15}
                className="font-mono text-sm"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={saveTemplate}>
                Actualizar Plantilla
              </Button>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vista Previa del Contrato</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-6 border rounded-lg bg-background">
              <pre className="whitespace-pre-wrap text-sm font-mono">{previewContent}</pre>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={() => copyToClipboard(previewContent)}>
                <Copy className="h-4 w-4 mr-2" />
                Copiar al Portapapeles
              </Button>
              <Button variant="outline" onClick={() => setIsPreviewDialogOpen(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}