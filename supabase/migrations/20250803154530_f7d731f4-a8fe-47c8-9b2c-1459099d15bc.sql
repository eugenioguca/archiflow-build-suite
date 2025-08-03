-- Crear tabla para chat del client portal
CREATE TABLE public.client_portal_chat (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.client_projects(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  is_client_message BOOLEAN NOT NULL DEFAULT false,
  read_by JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla para notificaciones del client portal
CREATE TABLE public.client_portal_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.client_projects(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS en las nuevas tablas
ALTER TABLE public.client_portal_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_portal_notifications ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para client_portal_chat
CREATE POLICY "Clients can view their own chat messages" 
ON public.client_portal_chat 
FOR SELECT 
USING (
  client_id IN (
    SELECT c.id FROM public.clients c
    JOIN public.profiles p ON p.id = c.profile_id
    WHERE p.user_id = auth.uid() AND p.role = 'client'
  )
);

CREATE POLICY "Clients can create chat messages" 
ON public.client_portal_chat 
FOR INSERT 
WITH CHECK (
  client_id IN (
    SELECT c.id FROM public.clients c
    JOIN public.profiles p ON p.id = c.profile_id
    WHERE p.user_id = auth.uid() AND p.role = 'client'
  )
  AND is_client_message = true
);

CREATE POLICY "Team members can view project chat" 
ON public.client_portal_chat 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role = ANY(ARRAY['admin'::user_role, 'employee'::user_role])
  )
);

CREATE POLICY "Team members can create chat messages" 
ON public.client_portal_chat 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role = ANY(ARRAY['admin'::user_role, 'employee'::user_role])
  )
  AND is_client_message = false
);

-- Políticas RLS para client_portal_notifications
CREATE POLICY "Clients can view their own notifications" 
ON public.client_portal_notifications 
FOR SELECT 
USING (
  client_id IN (
    SELECT c.id FROM public.clients c
    JOIN public.profiles p ON p.id = c.profile_id
    WHERE p.user_id = auth.uid() AND p.role = 'client'
  )
);

CREATE POLICY "Clients can update their notification read status" 
ON public.client_portal_notifications 
FOR UPDATE 
USING (
  client_id IN (
    SELECT c.id FROM public.clients c
    JOIN public.profiles p ON p.id = c.profile_id
    WHERE p.user_id = auth.uid() AND p.role = 'client'
  )
);

CREATE POLICY "Team members can manage notifications" 
ON public.client_portal_notifications 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role = ANY(ARRAY['admin'::user_role, 'employee'::user_role])
  )
);

-- Triggers para updated_at
CREATE TRIGGER update_client_portal_chat_updated_at
BEFORE UPDATE ON public.client_portal_chat
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_portal_notifications_updated_at
BEFORE UPDATE ON public.client_portal_notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Agregar índices para mejorar performance
CREATE INDEX idx_client_portal_chat_client_project ON public.client_portal_chat(client_id, project_id);
CREATE INDEX idx_client_portal_chat_created_at ON public.client_portal_chat(created_at DESC);
CREATE INDEX idx_client_portal_notifications_client_unread ON public.client_portal_notifications(client_id, read) WHERE read = false;