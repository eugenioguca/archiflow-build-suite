-- Eliminar tabla principal del chat y todas sus políticas RLS
DROP TRIGGER IF EXISTS notify_team_new_chat_message_trigger ON public.client_portal_chat;
DROP TRIGGER IF EXISTS notify_client_new_chat_response_trigger ON public.client_portal_chat;

-- Eliminar funciones relacionadas con notificaciones de chat
DROP FUNCTION IF EXISTS public.notify_team_new_chat_message();
DROP FUNCTION IF EXISTS public.notify_client_new_chat_response();

-- Eliminar función auxiliar si solo se usa para chat
DROP FUNCTION IF EXISTS public.is_client_of_project(uuid, uuid);

-- Eliminar todas las políticas RLS de la tabla client_portal_chat
DROP POLICY IF EXISTS "Clients can create their project chat messages" ON public.client_portal_chat;
DROP POLICY IF EXISTS "Clients can view their project chat messages" ON public.client_portal_chat;
DROP POLICY IF EXISTS "Team members can create team chat messages" ON public.client_portal_chat;
DROP POLICY IF EXISTS "Team members can view all project chat" ON public.client_portal_chat;

-- Eliminar la tabla principal del chat
DROP TABLE IF EXISTS public.client_portal_chat CASCADE;

-- Limpiar notificaciones relacionadas con chat
DELETE FROM public.module_notifications WHERE notification_type = 'new_chat_message';
DELETE FROM public.client_portal_notifications WHERE notification_type = 'new_team_message';