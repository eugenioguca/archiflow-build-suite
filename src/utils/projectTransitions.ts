import { supabase } from "@/integrations/supabase/client";

export interface TransitionData {
  projectId: string;
  fromStatus: string;
  toStatus: string;
  reason?: string;
  preserveDesignData?: boolean;
}

export interface DesignData {
  phases: any[];
  teamMembers: any[];
  budget: number;
  specifications: any;
}

/**
 * Handles the transition from design to construction with data preservation
 */
export async function transitionToConstruction(data: TransitionData): Promise<void> {
  const { projectId, reason } = data;
  
  try {
    // Get current design data before transition
    const designData = await preserveDesignData(projectId);
    
    // Update project status
    const { error } = await supabase
      .from('client_projects')
      .update({
        status: 'construction',
        moved_to_construction_at: new Date().toISOString(),
        conversion_notes: reason,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId);

    if (error) throw error;

    // Log transition for audit trail
    await logTransition({
      projectId,
      fromStatus: 'design',
      toStatus: 'construction',
      designData,
      reason
    });

  } catch (error) {
    console.error('Error transitioning to construction:', error);
    throw error;
  }
}

/**
 * Handles reverting from construction back to design
 */
export async function revertToDesign(data: TransitionData): Promise<void> {
  const { projectId, reason } = data;
  
  try {
    const { error } = await supabase
      .from('client_projects')
      .update({
        status: 'design',
        moved_to_construction_at: null,
        conversion_notes: reason,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId);

    if (error) throw error;

    // Log reversion for audit trail
    await logTransition({
      projectId,
      fromStatus: 'construction',
      toStatus: 'design',
      reason
    });

  } catch (error) {
    console.error('Error reverting to design:', error);
    throw error;
  }
}

/**
 * Preserves design data during transition
 */
async function preserveDesignData(projectId: string): Promise<DesignData> {
  try {
    // Fetch design phases
    const { data: phases } = await supabase
      .from('design_phases')
      .select('*')
      .eq('project_id', projectId)
      .order('phase_order');

    // Fetch team members
    const { data: teamMembers } = await supabase
      .from('project_team_members')
      .select(`
        *,
        profiles(full_name, position, department)
      `)
      .eq('project_id', projectId);

    // Fetch project budget and specs
    const { data: project } = await supabase
      .from('client_projects')
      .select('budget, project_description, timeline_months, construction_area')
      .eq('id', projectId)
      .single();

    return {
      phases: phases || [],
      teamMembers: teamMembers || [],
      budget: project?.budget || 0,
      specifications: {
        description: project?.project_description,
        timeline: project?.timeline_months,
        area: project?.construction_area
      }
    };
  } catch (error) {
    console.error('Error preserving design data:', error);
    throw error;
  }
}

/**
 * Logs transitions for audit trail
 */
async function logTransition(data: {
  projectId: string;
  fromStatus: string;
  toStatus: string;
  designData?: DesignData;
  reason?: string;
}): Promise<void> {
  try {
    const { data: user } = await supabase.auth.getUser();
    
    console.log('Transition logged:', {
      projectId: data.projectId,
      from: data.fromStatus,
      to: data.toStatus,
      timestamp: new Date().toISOString(),
      user: user.user?.id,
      reason: data.reason,
      hasDesignData: !!data.designData
    });
    
    // In a real implementation, you might want to store this in a dedicated audit table
  } catch (error) {
    console.error('Error logging transition:', error);
  }
}

/**
 * Validates if a project can transition to construction
 */
export async function validateConstructionTransition(projectId: string): Promise<{
  canTransition: boolean;
  reasons: string[];
}> {
  try {
    const reasons: string[] = [];
    
    // Check if design phases are completed
    const { data: phases } = await supabase
      .from('design_phases')
      .select('phase_name, status')
      .eq('project_id', projectId);

    const incompletePhases = (phases || []).filter(phase => 
      phase.status !== 'completed' && phase.phase_name !== 'Diseño Completado'
    );

    if (incompletePhases.length > 0) {
      reasons.push(`Fases incompletas: ${incompletePhases.map(p => p.phase_name).join(', ')}`);
    }

    // Check if project has required team members
    const { data: teamMembers } = await supabase
      .from('project_team_members')
      .select('role')
      .eq('project_id', projectId);

    const hasArchitect = (teamMembers || []).some(member => member.role === 'architect');
    if (!hasArchitect) {
      reasons.push('No hay arquitecto asignado al proyecto');
    }

    return {
      canTransition: reasons.length === 0,
      reasons
    };
  } catch (error) {
    console.error('Error validating transition:', error);
    return {
      canTransition: false,
      reasons: ['Error al validar la transición']
    };
  }
}