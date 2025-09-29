-- Read-only views for Planning v2 (clients and projects access)
-- These views provide safe, read-only access to existing data without exposing sensitive fields

-- View for clients (read-only)
CREATE OR REPLACE VIEW planning_v2_clients_ro AS
  SELECT 
    id,
    full_name,
    email,
    phone,
    created_at
  FROM clients
  WHERE id IS NOT NULL;

-- View for projects (read-only)
CREATE OR REPLACE VIEW planning_v2_projects_ro AS
  SELECT 
    id,
    project_name,
    client_id,
    status,
    created_at
  FROM client_projects
  WHERE id IS NOT NULL;

-- Grant SELECT access to authenticated users
GRANT SELECT ON planning_v2_clients_ro TO authenticated;
GRANT SELECT ON planning_v2_projects_ro TO authenticated;

-- Create simple indexes for search performance (ILIKE queries)
CREATE INDEX IF NOT EXISTS idx_clients_full_name_lower ON clients (LOWER(full_name));
CREATE INDEX IF NOT EXISTS idx_client_projects_name_lower ON client_projects (LOWER(project_name));

COMMENT ON VIEW planning_v2_clients_ro IS 'Read-only view of clients for Planning v2 module';
COMMENT ON VIEW planning_v2_projects_ro IS 'Read-only view of projects for Planning v2 module';