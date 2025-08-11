-- Eliminar tabla principal del chat y todas sus dependencias con CASCADE
DROP TABLE IF EXISTS public.client_portal_chat CASCADE;

-- Ahora eliminar las funciones que ya no tienen dependencias
DROP FUNCTION IF EXISTS public.notify_team_new_chat_message() CASCADE;
DROP FUNCTION IF EXISTS public.notify_client_new_chat_response() CASCADE;

-- Eliminar función auxiliar si solo se usa para chat
DROP FUNCTION IF EXISTS public.is_client_of_project(uuid, uuid) CASCADE;

-- Limpiar notificaciones relacionadas con chat
DELETE FROM public.module_notifications WHERE notification_type = 'new_chat_message';
DELETE FROM public.client_portal_notifications WHERE notification_type = 'new_team_message';