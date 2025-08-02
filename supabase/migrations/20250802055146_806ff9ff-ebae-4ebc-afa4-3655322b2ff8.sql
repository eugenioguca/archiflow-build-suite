-- Update client_status enum to include all necessary states
ALTER TYPE client_status ADD VALUE IF NOT EXISTS 'construction';
ALTER TYPE client_status ADD VALUE IF NOT EXISTS 'design_completed';

-- Also update the client_projects table to ensure we have the right structure
-- and indexes for better performance
CREATE INDEX IF NOT EXISTS idx_client_projects_status ON client_projects(status);
CREATE INDEX IF NOT EXISTS idx_client_projects_moved_to_construction ON client_projects(moved_to_construction_at) WHERE moved_to_construction_at IS NOT NULL;