-- Add new enum values for client_status to support design completion states
ALTER TYPE client_status ADD VALUE IF NOT EXISTS 'design_only_completed';

-- Update any existing projects that may have incorrect statuses
-- This ensures consistency with the new workflow
UPDATE client_projects 
SET status = 'construction' 
WHERE status = 'active' AND moved_to_construction_at IS NOT NULL;