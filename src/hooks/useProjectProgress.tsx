import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ProgressData {
  designProgress: number;
  paymentProgress: number;
  constructionProgress: number;
  overallProgress: number;
}

export const useProjectProgress = (projectId: string, clientId: string) => {
  const [progress, setProgress] = useState<ProgressData>({
    designProgress: 0,
    paymentProgress: 0,
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

        // Calculate payment progress
        const { data: paymentPlans } = await supabase
          .from('payment_plans')
          .select(`
            *,
            payment_installments(*)
          `)
          .eq('client_project_id', projectId)
          .eq('status', 'active');

        let paymentProgress = 0;
        if (paymentPlans?.length > 0) {
          const totalInstallments = paymentPlans.reduce((acc, plan) => 
            acc + (plan.payment_installments?.length || 0), 0);
          const paidInstallments = paymentPlans.reduce((acc, plan) => 
            acc + (plan.payment_installments?.filter((inst: any) => inst.status === 'paid').length || 0), 0);
          
          paymentProgress = totalInstallments > 0 ? (paidInstallments / totalInstallments) * 100 : 0;
        }

        // Calculate construction progress
        const { data: constructionPhases } = await supabase
          .from('construction_phases')
          .select('progress_percentage')
          .eq('project_id', projectId);

        const constructionProgress = constructionPhases?.length > 0
          ? constructionPhases.reduce((acc, phase) => acc + (phase.progress_percentage || 0), 0) / constructionPhases.length
          : 0;

        // Calculate overall progress with weighted factors
        const weights = {
          design: 0.3,
          payment: 0.2,
          construction: 0.5
        };

        const overallProgress = Math.round(
          (designProgress * weights.design) +
          (paymentProgress * weights.payment) +
          (constructionProgress * weights.construction)
        );

        setProgress({
          designProgress: Math.round(designProgress),
          paymentProgress: Math.round(paymentProgress),
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