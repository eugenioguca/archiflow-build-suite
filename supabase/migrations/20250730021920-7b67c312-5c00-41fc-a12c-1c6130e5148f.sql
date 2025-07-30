-- Crear enums para el CRM avanzado
CREATE TYPE project_type AS ENUM ('residential', 'commercial', 'industrial', 'renovation', 'landscape', 'interior_design');
CREATE TYPE contact_method AS ENUM ('phone', 'email', 'whatsapp', 'meeting', 'site_visit', 'video_call');
CREATE TYPE activity_type AS ENUM ('call', 'email', 'meeting', 'proposal_sent', 'site_visit', 'follow_up', 'negotiation', 'contract_review');
CREATE TYPE lead_source AS ENUM ('website', 'referral', 'social_media', 'advertisement', 'cold_call', 'event', 'partner');
CREATE TYPE priority_level AS ENUM ('low', 'medium', 'high', 'urgent');

-- Mejorar tabla de clientes para CRM avanzado
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS lead_source lead_source DEFAULT 'website';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS priority priority_level DEFAULT 'medium';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS project_type project_type;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS project_size TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS timeline_months INTEGER;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS decision_maker_name TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS decision_maker_role TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS company_size TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS social_media JSONB;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS last_contact_date DATE;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS next_contact_date DATE;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS preferred_contact_method contact_method DEFAULT 'email';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS location_details JSONB;

-- Tabla de actividades del CRM
CREATE TABLE IF NOT EXISTS public.crm_activities (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    activity_type activity_type NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    scheduled_date TIMESTAMP WITH TIME ZONE,
    completed_date TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    outcome TEXT,
    next_action TEXT,
    next_action_date TIMESTAMP WITH TIME ZONE,
    contact_method contact_method,
    attachments JSONB,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla de recordatorios y notificaciones
CREATE TABLE IF NOT EXISTS public.crm_reminders (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    activity_id UUID REFERENCES public.crm_activities(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    reminder_date TIMESTAMP WITH TIME ZONE NOT NULL,
    is_sent BOOLEAN DEFAULT FALSE,
    email_sent BOOLEAN DEFAULT FALSE,
    popup_shown BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla de propuestas y documentos
CREATE TABLE IF NOT EXISTS public.crm_proposals (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    title TEXT NOT NULL,
    description TEXT,
    amount NUMERIC(12,2),
    currency TEXT DEFAULT 'MXN',
    status TEXT DEFAULT 'draft',
    proposal_date DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE,
    document_url TEXT,
    terms_conditions TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla de métricas de rendimiento
CREATE TABLE IF NOT EXISTS public.crm_metrics (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    calls_made INTEGER DEFAULT 0,
    emails_sent INTEGER DEFAULT 0,
    meetings_held INTEGER DEFAULT 0,
    proposals_sent INTEGER DEFAULT 0,
    leads_converted INTEGER DEFAULT 0,
    revenue_generated NUMERIC(12,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, date)
);

-- RLS Policies para las nuevas tablas
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_metrics ENABLE ROW LEVEL SECURITY;

-- Políticas para crm_activities
CREATE POLICY "Users can view activities they created or for their assigned clients"
ON public.crm_activities FOR SELECT
USING (
    user_id = auth.uid() OR 
    client_id IN (
        SELECT c.id FROM public.clients c 
        JOIN public.profiles p ON c.assigned_advisor_id = p.id 
        WHERE p.user_id = auth.uid()
    ) OR
    EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'employee')
    )
);

CREATE POLICY "Users can create activities" 
ON public.crm_activities FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own activities" 
ON public.crm_activities FOR UPDATE 
USING (user_id = auth.uid());

-- Políticas para crm_reminders
CREATE POLICY "Users can view their own reminders" 
ON public.crm_reminders FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can create reminders" 
ON public.crm_reminders FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own reminders" 
ON public.crm_reminders FOR UPDATE 
USING (user_id = auth.uid());

-- Políticas para crm_proposals
CREATE POLICY "Users can view proposals they created or for their clients" 
ON public.crm_proposals FOR SELECT 
USING (
    created_by = auth.uid() OR 
    EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'employee')
    )
);

CREATE POLICY "Users can create proposals" 
ON public.crm_proposals FOR INSERT 
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own proposals" 
ON public.crm_proposals FOR UPDATE 
USING (created_by = auth.uid());

-- Políticas para crm_metrics
CREATE POLICY "Users can view their own metrics" 
ON public.crm_metrics FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own metrics" 
ON public.crm_metrics FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own metrics" 
ON public.crm_metrics FOR UPDATE 
USING (user_id = auth.uid());

-- Triggers para updated_at
CREATE TRIGGER update_crm_activities_updated_at
    BEFORE UPDATE ON public.crm_activities
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crm_proposals_updated_at
    BEFORE UPDATE ON public.crm_proposals
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para optimización
CREATE INDEX idx_crm_activities_client_id ON public.crm_activities(client_id);
CREATE INDEX idx_crm_activities_user_id ON public.crm_activities(user_id);
CREATE INDEX idx_crm_activities_scheduled_date ON public.crm_activities(scheduled_date);
CREATE INDEX idx_crm_reminders_user_id ON public.crm_reminders(user_id);
CREATE INDEX idx_crm_reminders_reminder_date ON public.crm_reminders(reminder_date);
CREATE INDEX idx_crm_proposals_client_id ON public.crm_proposals(client_id);
CREATE INDEX idx_crm_metrics_user_date ON public.crm_metrics(user_id, date);