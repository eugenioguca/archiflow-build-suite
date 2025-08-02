-- Add new status values to client_projects status enum
ALTER TYPE client_status ADD VALUE 'design';
ALTER TYPE client_status ADD VALUE 'construction';
ALTER TYPE client_status ADD VALUE 'design_completed';
ALTER TYPE client_status ADD VALUE 'design_only_completed';