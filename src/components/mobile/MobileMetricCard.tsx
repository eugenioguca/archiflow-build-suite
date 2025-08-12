import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  ArrowUp,
  ArrowDown,
  LucideIcon
} from "lucide-react";

interface MobileMetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    label?: string;
    type: 'positive' | 'negative' | 'neutral';
  };
  progress?: {
    value: number;
    max?: number;
    label?: string;
  };
  badge?: {
    text: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  };
  className?: string;
  onClick?: () => void;
}

const getTrendIcon = (type: 'positive' | 'negative' | 'neutral') => {
  switch (type) {
    case 'positive':
      return TrendingUp;
    case 'negative':
      return TrendingDown;
    default:
      return Minus;
  }
};

const getTrendColor = (type: 'positive' | 'negative' | 'neutral') => {
  switch (type) {
    case 'positive':
      return 'text-green-600';
    case 'negative':
      return 'text-red-600';
    default:
      return 'text-muted-foreground';
  }
};

const formatValue = (value: string | number): string => {
  if (typeof value === 'number') {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toLocaleString();
  }
  return value;
};

export function MobileMetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  progress,
  badge,
  className = "",
  onClick
}: MobileMetricCardProps) {
  const TrendIcon = trend ? getTrendIcon(trend.type) : null;
  const trendColor = trend ? getTrendColor(trend.type) : '';

  return (
    <Card 
      className={`bg-card/50 border border-border/20 shadow-sm hover:shadow-md transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:bg-card/70' : ''
      } ${className}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {Icon && (
                <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
              )}
              <h3 className="text-sm font-medium text-muted-foreground truncate">
                {title}
              </h3>
            </div>
            
            {badge && (
              <Badge 
                variant={badge.variant || 'default'} 
                className="text-xs h-5 px-2 flex-shrink-0"
              >
                {badge.text}
              </Badge>
            )}
          </div>

          {/* Main Value */}
          <div className="space-y-1">
            <p className="text-2xl font-bold text-foreground leading-none">
              {formatValue(value)}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">
                {subtitle}
              </p>
            )}
          </div>

          {/* Trend */}
          {trend && (
            <div className={`flex items-center gap-1 text-xs ${trendColor}`}>
              {TrendIcon && <TrendIcon className="h-3 w-3" />}
              <span className="font-medium">
                {trend.value > 0 ? '+' : ''}{trend.value}%
              </span>
              {trend.label && (
                <span className="text-muted-foreground">
                  {trend.label}
                </span>
              )}
            </div>
          )}

          {/* Progress */}
          {progress && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">
                  {progress.label || 'Progreso'}
                </span>
                <span className="font-medium">
                  {progress.value}{progress.max ? `/${progress.max}` : '%'}
                </span>
              </div>
              <Progress 
                value={progress.max ? (progress.value / progress.max) * 100 : progress.value} 
                className="h-2" 
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}