import { useState, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, ZoomIn, ZoomOut, RotateCcw, Maximize } from 'lucide-react';

interface ImageViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  title?: string | null;
  description?: string | null;
}

export function ImageViewerModal({
  open,
  onOpenChange,
  imageUrl,
  title,
  description
}: ImageViewerModalProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = useCallback(() => {
    setScale(prev => Math.min(prev * 1.5, 5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale(prev => Math.max(prev / 1.5, 0.1));
  }, []);

  const handleReset = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleFitToScreen = useCallback(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const img = container.querySelector('img');
    
    if (img) {
      const imgRect = img.getBoundingClientRect();
      const scaleX = (containerRect.width - 40) / imgRect.width;
      const scaleY = (containerRect.height - 40) / imgRect.height;
      const newScale = Math.min(scaleX, scaleY, 1);
      
      setScale(newScale);
      setPosition({ x: 0, y: 0 });
    }
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  }, [scale, position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  }, [isDragging, dragStart, scale]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(prev => Math.min(Math.max(prev * delta, 0.1), 5));
  }, []);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setIsDragging(false);
    }
  }, [open]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;
      
      switch (e.key) {
        case 'Escape':
          onOpenChange(false);
          break;
        case '+':
        case '=':
          e.preventDefault();
          handleZoomIn();
          break;
        case '-':
          e.preventDefault();
          handleZoomOut();
          break;
        case '0':
          e.preventDefault();
          handleReset();
          break;
        case 'f':
          e.preventDefault();
          handleFitToScreen();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange, handleZoomIn, handleZoomOut, handleReset, handleFitToScreen]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0 bg-black/95">
        {/* Header with controls */}
        <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2 text-white text-sm">
              {scale.toFixed(1)}x
            </div>
            {(title || description) && (
              <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2 text-white max-w-md">
                {title && <div className="font-semibold text-sm">{title}</div>}
                {description && <div className="text-xs opacity-90 line-clamp-2">{description}</div>}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              onClick={handleZoomOut}
              variant="secondary"
              size="sm"
              className="bg-black/50 hover:bg-black/70 text-white border-white/20"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              onClick={handleZoomIn}
              variant="secondary"
              size="sm"
              className="bg-black/50 hover:bg-black/70 text-white border-white/20"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              onClick={handleFitToScreen}
              variant="secondary"
              size="sm"
              className="bg-black/50 hover:bg-black/70 text-white border-white/20"
            >
              <Maximize className="h-4 w-4" />
            </Button>
            <Button
              onClick={handleReset}
              variant="secondary"
              size="sm"
              className="bg-black/50 hover:bg-black/70 text-white border-white/20"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => onOpenChange(false)}
              variant="secondary"
              size="sm"
              className="bg-black/50 hover:bg-black/70 text-white border-white/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Image container */}
        <div
          ref={containerRef}
          className="w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          <img
            src={imageUrl}
            alt={title || 'Imagen expandida'}
            className="max-w-none transition-transform duration-200 select-none"
            style={{
              transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
              transformOrigin: 'center center'
            }}
            draggable={false}
          />
        </div>

        {/* Help text */}
        <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2 text-white text-xs opacity-75">
          <div>Scroll para zoom • Arrastra para mover</div>
          <div>Atajos: +/- zoom • 0 reset • F ajustar • ESC cerrar</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}