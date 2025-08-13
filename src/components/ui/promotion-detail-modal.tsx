import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Calendar, Star } from 'lucide-react';

interface Promotion {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

interface PromotionDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promotion: Promotion | null;
}

export function PromotionDetailModal({
  open,
  onOpenChange,
  promotion
}: PromotionDetailModalProps) {
  if (!promotion) return null;

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const formatOptions: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    };

    return `${start.toLocaleDateString('es-ES', formatOptions)} - ${end.toLocaleDateString('es-ES', formatOptions)}`;
  };

  const isPromotionActive = (promotion: Promotion) => {
    const now = new Date();
    const start = new Date(promotion.start_date);
    const end = new Date(promotion.end_date);
    return now >= start && now <= end;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-warning" />
            Detalle de Promoción
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Image */}
          {promotion.image_url && (
            <div className="relative rounded-lg overflow-hidden">
              <img
                src={promotion.image_url}
                alt={promotion.title}
                className="w-full h-64 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            </div>
          )}

          {/* Title and Status */}
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-2xl font-bold leading-tight">
                {promotion.title}
              </h2>
              <Badge 
                variant={isPromotionActive(promotion) ? "default" : "secondary"}
                className="flex-shrink-0"
              >
                {isPromotionActive(promotion) ? 'Activa' : 'Programada'}
              </Badge>
            </div>

            {/* Date Range */}
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">
                {formatDateRange(promotion.start_date, promotion.end_date)}
              </span>
            </div>

            {/* Description */}
            {promotion.description && (
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">Descripción</h3>
                <div className="prose prose-sm max-w-none">
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {promotion.description}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}