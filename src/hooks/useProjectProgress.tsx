import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ProgressData {
  designProgress: number;
  constructionProgress: number;
  overallProgress: number;
}

export const useProjectProgress = (projectId: string, clientId: string) => {
  const [progress, setProgress] = useState<ProgressData>({
    designProgress: 0,
    constructionProgress: 0,
    overallProgress: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const calculateProgress = async () => {
      if (!projectId || !clientId) return;
      
      try {
        setLoading(true);

        // Calculate design progress
        const { data: designPhases } = await supabase
          .from('design_phases')
          .select('status')
          .eq('project_id', projectId);

        const designProgress = designPhases?.length > 0 
          ? (designPhases.filter(phase => phase.status === 'completed').length / designPhases.length) * 100 
          : 0;

        // Calculate construction progress
        const { data: constructionPhases } = await supabase
          .from('construction_phases')
          .select('progress_percentage')
          .eq('project_id', projectId);

        const constructionProgress = constructionPhases?.length > 0
          ? constructionPhases.reduce((acc, phase) => acc + (phase.progress_percentage || 0), 0) / constructionPhases.length
          : 0;

        // Calculate overall progress with weighted factors (payment removed)
        const weights = {
          design: 0.4,
          construction: 0.6
        };

        const overallProgress = Math.round(
          (designProgress * weights.design) +
          (constructionProgress * weights.construction)
        );

        setProgress({
          designProgress: Math.round(designProgress),
          constructionProgress: Math.round(constructionProgress),
          overallProgress
        });

        // Update project progress in database
        await supabase
          .from('client_projects')
          .update({ overall_progress_percentage: overallProgress })
          .eq('id', projectId);

      } catch (error) {
        console.error('Error calculating progress:', error);
      } finally {
        setLoading(false);
      }
    };

    calculateProgress();
  }, [projectId, clientId]);

  return { progress, loading };
};