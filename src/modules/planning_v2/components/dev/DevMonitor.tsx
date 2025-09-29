/**
 * DevMonitor - Performance monitoring panel (DEV-ONLY)
 * Shows: recompute time, grid FPS, database latency
 */
import { useState, useEffect, useRef } from 'react';
import { Activity, Database, Zap } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface DevMonitorProps {
  recomputeTime?: number;
  dbLatency?: number;
}

export function DevMonitor({ recomputeTime = 0, dbLatency = 0 }: DevMonitorProps) {
  // Guard: only render in development
  if (!import.meta.env.DEV) return null;

  const [fps, setFps] = useState(60);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const rafIdRef = useRef<number>();

  useEffect(() => {
    const measureFPS = () => {
      frameCountRef.current++;
      const now = performance.now();
      const elapsed = now - lastTimeRef.current;

      // Update FPS every second
      if (elapsed >= 1000) {
        const currentFps = Math.round((frameCountRef.current * 1000) / elapsed);
        setFps(currentFps);
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }

      rafIdRef.current = requestAnimationFrame(measureFPS);
    };

    rafIdRef.current = requestAnimationFrame(measureFPS);

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  const getFpsColor = (fps: number) => {
    if (fps >= 55) return 'text-green-500';
    if (fps >= 30) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getLatencyColor = (ms: number) => {
    if (ms === 0) return 'text-muted-foreground';
    if (ms < 100) return 'text-green-500';
    if (ms < 500) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <Card className="fixed bottom-4 right-4 z-50 bg-background/95 backdrop-blur-sm border-2 shadow-lg">
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground border-b pb-2">
          <Activity className="h-3 w-3" />
          <span>Monitor de Rendimiento</span>
        </div>

        <div className="space-y-1.5">
          {/* Grid FPS */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Grid FPS:</span>
            </div>
            <span className={`text-sm font-mono font-semibold ${getFpsColor(fps)}`}>
              {fps} fps
            </span>
          </div>

          {/* Recompute Time */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Recálculo:</span>
            </div>
            <span className={`text-sm font-mono font-semibold ${getLatencyColor(recomputeTime)}`}>
              {recomputeTime > 0 ? `${recomputeTime.toFixed(0)}ms` : '-'}
            </span>
          </div>

          {/* DB Latency */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Database className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Latencia BD:</span>
            </div>
            <span className={`text-sm font-mono font-semibold ${getLatencyColor(dbLatency)}`}>
              {dbLatency > 0 ? `${dbLatency.toFixed(0)}ms` : '-'}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
