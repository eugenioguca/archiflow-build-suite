-- Corregir el construction_budget basándose en la suma real de construction_budget_items
UPDATE client_projects 
SET construction_budget = (
  SELECT COALESCE(SUM(total_price), 0)
  FROM construction_budget_items 
  WHERE construction_budget_items.project_id = client_projects.id
)
WHERE id IN (
  SELECT DISTINCT project_id 
  FROM construction_budget_items
) AND construction_budget != (
  SELECT COALESCE(SUM(total_price), 0)
  FROM construction_budget_items 
  WHERE construction_budget_items.project_id = client_projects.id
);