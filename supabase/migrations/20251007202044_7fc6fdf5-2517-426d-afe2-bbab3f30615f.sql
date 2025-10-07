-- RPC transaccional para borrar presupuesto y dependencias
-- Elimina un presupuesto con todas sus relaciones en una sola transacción

create or replace function planning_v2_delete_budget(p_budget_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_profile_id uuid;
  v_budget_created_by uuid;
  v_is_admin boolean;
  v_has_planning_role boolean;
begin
  -- Obtener el profile_id del usuario actual
  select id into v_user_profile_id
  from profiles
  where user_id = auth.uid();
  
  if v_user_profile_id is null then
    raise exception 'User profile not found';
  end if;
  
  -- Obtener el created_by del presupuesto
  select created_by into v_budget_created_by
  from planning_budgets
  where id = p_budget_id;
  
  if v_budget_created_by is null then
    raise exception 'Budget not found';
  end if;
  
  -- Verificar si es admin
  select (role = 'admin') into v_is_admin
  from profiles
  where id = v_user_profile_id;
  
  -- Verificar si tiene rol de planning owner
  select has_planning_v2_role(auth.uid(), 'owner') into v_has_planning_role;
  
  -- Permisos: el creador, admin o planning owner pueden borrar
  if not (v_budget_created_by = v_user_profile_id or v_is_admin or v_has_planning_role) then
    raise exception 'Permission denied: you are not allowed to delete this budget';
  end if;
  
  -- Borrado en cascada (orden importante para respetar FKs)
  -- 1. Snapshots (referencias al budget)
  delete from planning_snapshots where budget_id = p_budget_id;
  
  -- 2. Conceptos (a través de partidas)
  delete from planning_conceptos 
  where partida_id in (
    select id from planning_partidas where budget_id = p_budget_id
  );
  
  -- 3. Partidas
  delete from planning_partidas where budget_id = p_budget_id;
  
  -- 4. Budget principal
  delete from planning_budgets where id = p_budget_id;
  
  -- Log de auditoría
  insert into security_audit_log (
    event_type,
    user_id,
    event_data
  ) values (
    'planning_v2_budget_deleted',
    auth.uid(),
    jsonb_build_object(
      'budget_id', p_budget_id,
      'deleted_by_profile_id', v_user_profile_id,
      'deleted_at', now()
    )
  );
  
end;
$$;

-- Comentario para documentación
comment on function planning_v2_delete_budget(uuid) is 
'Borra un presupuesto de planning_v2 y todas sus dependencias en una transacción atómica. 
Solo el creador, admins o usuarios con rol planning owner pueden ejecutar esta función.';
