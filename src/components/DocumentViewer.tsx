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

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = documentUrl;
    link.download = documentName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleZoomIn = () => setZoom(zoom * 1.2);
  const handleZoomOut = () => setZoom(zoom / 1.2);
  const handleRotate = () => setRotation((rotation + 90) % 360);

  const isPDF = fileType?.toLowerCase() === 'pdf' || documentUrl.includes('.pdf');
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(fileType?.toLowerCase()) || 
                  /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(documentUrl);

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
                }}
              />
            </div>
          ) : fileType?.toLowerCase() === 'txt' ? (
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <iframe
                src={documentUrl}
                width="100%"
                height="500px"
                className="border rounded"
                title={documentName}
              />
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