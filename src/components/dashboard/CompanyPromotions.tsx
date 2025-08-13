import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PromotionDetailModal } from '@/components/ui/promotion-detail-modal';

interface Promotion {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export function CompanyPromotions() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPromotions();
  }, []);

  const fetchPromotions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('company_promotions')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching promotions:', error);
        return;
      }

      setPromotions(data || []);
    } catch (error) {
      console.error('Error fetching promotions:', error);
    } finally {
      setLoading(false);
    }
  };

  const nextPromotion = () => {
    setCurrentIndex((prev) => (prev + 1) % promotions.length);
  };

  const prevPromotion = () => {
    setCurrentIndex((prev) => (prev - 1 + promotions.length) % promotions.length);
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const formatOptions: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'short'
    };

    return `${start.toLocaleDateString('es-ES', formatOptions)} - ${end.toLocaleDateString('es-ES', formatOptions)}`;
  };

  const isPromotionActive = (promotion: Promotion) => {
    const now = new Date();
    const start = new Date(promotion.start_date);
    const end = new Date(promotion.end_date);
    return now >= start && now <= end;
  };

  if (loading) {
    return (
      <Card className="glassmorphic-bg border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-warning" />
            Promociones Corporativas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 bg-muted/50 rounded-lg animate-pulse"></div>
        </CardContent>
      </Card>
    );
  }

  if (promotions.length === 0) {
    return (
      <Card className="glassmorphic-bg border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-warning" />
            Promociones Corporativas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Star className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-muted-foreground mb-2">
              No hay promociones activas
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Las promociones corporativas aparecerán aquí
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentPromotion = promotions[currentIndex];

  return (
    <>
      <Card className="glassmorphic-bg border-0 shadow-lg overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-warning" />
            Promociones Corporativas
          </CardTitle>
        </CardHeader>
        
        <CardContent className="pb-6">
          <div className="relative">
            {/* Promotion Content - Clickeable */}
            <div 
              className="space-y-4 cursor-pointer group hover:bg-muted/30 rounded-lg p-3 transition-colors"
              onClick={() => setShowDetailModal(true)}
            >
              {currentPromotion.image_url && (
                <div className="relative h-40 rounded-lg overflow-hidden">
                  <img
                    src={currentPromotion.image_url}
                    alt={currentPromotion.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                </div>
              )}
              
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-lg leading-tight group-hover:text-primary transition-colors">
                    {currentPromotion.title}
                  </h3>
                  <Badge 
                    variant={isPromotionActive(currentPromotion) ? "default" : "secondary"}
                    className="ml-2"
                  >
                    {isPromotionActive(currentPromotion) ? 'Activa' : 'Programada'}
                  </Badge>
                </div>
                
                {currentPromotion.description && (
                  <div className="max-h-20 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                    <p className="text-sm text-muted-foreground pr-2">
                      {currentPromotion.description}
                    </p>
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground">
                  {formatDateRange(currentPromotion.start_date, currentPromotion.end_date)}
                </p>
                
                <p className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  Haz clic para ver más detalles
                </p>
              </div>
            </div>

            {/* Navigation */}
            {promotions.length > 1 && (
              <div className="flex items-center justify-between mt-6">
                <Button
                  onClick={prevPromotion}
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <div className="flex space-x-1">
                  {promotions.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentIndex(index)}
                      className={`
                        w-2 h-2 rounded-full transition-colors
                        ${index === currentIndex ? 'bg-primary' : 'bg-muted-foreground/30'}
                      `}
                    />
                  ))}
                </div>
                
                <Button
                  onClick={nextPromotion}
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>


      {/* Promotion Detail Modal */}
      <PromotionDetailModal
        open={showDetailModal}
        onOpenChange={setShowDetailModal}
        promotion={currentPromotion}
      />
    </>
  );
}