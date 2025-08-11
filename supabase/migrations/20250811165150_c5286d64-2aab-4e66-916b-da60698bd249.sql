-- Eliminar todas las tablas y funciones relacionadas con el calendario

-- Drop funciones relacionadas con el calendario
DROP FUNCTION IF EXISTS public.auto_add_event_participant() CASCADE;
DROP FUNCTION IF EXISTS public.update_personal_events_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.search_users_and_clients_for_invitation(text, integer) CASCADE;
DROP FUNCTION IF EXISTS public.search_users_for_invitation(text, integer) CASCADE;
DROP FUNCTION IF EXISTS public.decline_event_invitation(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.accept_event_invitation(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.notify_client_event_invitation() CASCADE;

-- Drop tablas relacionadas con el calendario (en orden correcto para evitar problemas de FK)
DROP TABLE IF EXISTS public.event_alerts CASCADE;
DROP TABLE IF EXISTS public.event_participants CASCADE;
DROP TABLE IF EXISTS public.event_invitations CASCADE;
DROP TABLE IF EXISTS public.personal_events CASCADE;

-- Limpiar triggers que puedan estar referenciando estas funciones
-- (Los triggers se eliminan automáticamente al hacer DROP FUNCTION CASCADE)