import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

interface DocumentViewerProps {
  isOpen: boolean;
  onClose: () => void;
  documentUrl: string;
  documentName: string;
  fileType: string;
}

export function DocumentViewer({ isOpen, onClose, documentUrl, documentName, fileType }: DocumentViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const handleDownload = async () => {
    try {
      // Descargar preservando el tipo de archivo original
      const response = await fetch(documentUrl);
      if (!response.ok) throw new Error('Error al obtener el archivo');
      
      const blob = await response.blob();
      const link = document.createElement('a');
      const objectUrl = URL.createObjectURL(blob);
      
      link.href = objectUrl;
      link.download = documentName;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Limpiar el objeto URL
      setTimeout(() => URL.revokeObjectURL(objectUrl), 100);
    } catch (error) {
      console.error('Error downloading file:', error);
      // Fallback al método tradicional
      const link = document.createElement('a');
      link.href = documentUrl;
      link.download = documentName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleZoomIn = () => setZoom(zoom * 1.2);
  const handleZoomOut = () => setZoom(zoom / 1.2);
  const handleRotate = () => setRotation((rotation + 90) % 360);

  const getFileTypeFromUrl = (url: string) => {
    const extension = url.split('.').pop()?.toLowerCase() || '';
    return extension;
  };

  const detectedExtension = getFileTypeFromUrl(documentUrl);
  const actualFileType = fileType?.toLowerCase() || detectedExtension;
  
  const isPDF = actualFileType === 'pdf' || detectedExtension === 'pdf';
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(actualFileType) || 
                  ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(detectedExtension);
  const isText = ['txt', 'csv', 'json', 'xml'].includes(actualFileType) || 
                 ['txt', 'csv', 'json', 'xml'].includes(detectedExtension);
  const isDocument = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(actualFileType) || 
                     ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(detectedExtension);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">{documentName}</DialogTitle>
            <div className="flex items-center gap-2">
              {isImage && (
                <>
                  <Button size="sm" variant="outline" onClick={handleZoomOut}>
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(zoom * 100)}%
                  </span>
                  <Button size="sm" variant="outline" onClick={handleZoomIn}>
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleRotate}>
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </>
              )}
              <Button size="sm" variant="outline" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Descargar
              </Button>
              <Button size="sm" variant="outline" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto bg-gray-50 p-4">
          {isPDF ? (
            <div className="w-full h-[70vh] bg-white rounded-lg shadow-sm">
              <iframe
                src={`${documentUrl}#toolbar=1&navpanes=1&scrollbar=1&page=1&view=FitH`}
                width="100%"
                height="100%"
                className="rounded-lg border"
                title={documentName}
                onError={() => {
                  console.error('Error loading PDF in iframe');
                }}
              />
            </div>
          ) : isImage ? (
            <div className="flex justify-center items-center min-h-[60vh]">
              <img
                src={documentUrl}
                alt={documentName}
                className="max-w-full max-h-full object-contain transition-transform duration-200"
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transformOrigin: 'center'
                }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/placeholder.svg';
                  console.error('Error loading image:', documentUrl);
                }}
              />
            </div>
          ) : isText ? (
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <iframe
                src={documentUrl}
                width="100%"
                height="500px"
                className="border rounded"
                title={documentName}
                onError={() => {
                  console.error('Error loading text file in iframe');
                }}
              />
            </div>
          ) : isDocument ? (
            <div className="flex flex-col items-center justify-center h-60 bg-white rounded-lg shadow-sm">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-lg font-medium mb-2">Documento de Office</h3>
              <p className="text-muted-foreground text-center mb-4">
                Este tipo de documento se abrirá en una aplicación externa.<br />
                Haz clic en "Descargar" para abrir el archivo.
              </p>
              <Button onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Abrir {documentName}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-60 bg-white rounded-lg shadow-sm">
              <div className="text-6xl mb-4">📄</div>
              <h3 className="text-lg font-medium mb-2">Vista previa no disponible</h3>
              <p className="text-muted-foreground text-center mb-4">
                No se puede mostrar una vista previa de este tipo de archivo.<br />
                Haz clic en "Descargar" para abrir el archivo.
              </p>
              <Button onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Descargar {documentName}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}