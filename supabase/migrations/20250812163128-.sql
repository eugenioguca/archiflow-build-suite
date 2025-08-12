-- ULTRA SIMPLIFICACIÓN DEL CHAT - ELIMINAR TODA COMPLEJIDAD

-- Paso 1: Limpiar TODAS las políticas existentes
DROP POLICY IF EXISTS "Chat view access for project members" ON public.project_chat;
DROP POLICY IF EXISTS "Chat message creation for project members" ON public.project_chat;
DROP POLICY IF EXISTS "Chat notifications view for employees" ON public.chat_notifications;
DROP POLICY IF EXISTS "Chat notifications update for employees" ON public.chat_notifications;
DROP POLICY IF EXISTS "Chat notifications view for clients" ON public.chat_notifications;
DROP POLICY IF EXISTS "Chat notifications update for clients" ON public.chat_notifications;
DROP POLICY IF EXISTS "System can create notifications" ON public.chat_notifications;

-- Paso 2: Políticas ULTRA SIMPLES para project_chat
-- Solo 2 políticas básicas

CREATE POLICY "Anyone can view project chat if authenticated" 
ON public.project_chat 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can send messages with their profile id" 
ON public.project_chat 
FOR INSERT 
WITH CHECK (
  sender_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
);

-- Paso 3: Políticas simples para chat_notifications
CREATE POLICY "Users can view their notifications" 
ON public.chat_notifications 
FOR SELECT 
USING (
  recipient_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Users can update their notifications" 
ON public.chat_notifications 
FOR UPDATE 
USING (
  recipient_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
);

CREATE POLICY "System creates notifications" 
ON public.chat_notifications 
FOR INSERT 
WITH CHECK (true);