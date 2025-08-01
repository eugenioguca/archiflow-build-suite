-- Create commercial alliances table
CREATE TABLE public.commercial_alliances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  commission_rate NUMERIC(5,2) DEFAULT 0,
  website TEXT,
  address TEXT,
  notes TEXT,
  active BOOLEAN DEFAULT true,
  clients_referred INTEGER DEFAULT 0,
  projects_converted INTEGER DEFAULT 0,
  total_commission_earned NUMERIC(12,2) DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.commercial_alliances ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Employees and admins can manage commercial alliances" 
ON public.commercial_alliances 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() 
  AND p.role IN ('admin', 'employee')
));

-- Add commercial_alliance to lead_source enum
ALTER TYPE lead_source ADD VALUE 'commercial_alliance';

-- Add alliance_id column to clients table
ALTER TABLE public.clients ADD COLUMN alliance_id UUID REFERENCES public.commercial_alliances(id);

-- Create index for better performance
CREATE INDEX idx_clients_alliance_id ON public.clients(alliance_id);

-- Create trigger for updated_at
CREATE TRIGGER update_commercial_alliances_updated_at
  BEFORE UPDATE ON public.commercial_alliances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update alliance statistics
CREATE OR REPLACE FUNCTION public.update_alliance_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update clients_referred count
    UPDATE public.commercial_alliances 
    SET clients_referred = clients_referred + 1,
        updated_at = now()
    WHERE id = NEW.alliance_id AND NEW.alliance_id IS NOT NULL;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle alliance change
    IF OLD.alliance_id IS DISTINCT FROM NEW.alliance_id THEN
      -- Decrease count for old alliance
      IF OLD.alliance_id IS NOT NULL THEN
        UPDATE public.commercial_alliances 
        SET clients_referred = clients_referred - 1,
            updated_at = now()
        WHERE id = OLD.alliance_id;
      END IF;
      -- Increase count for new alliance
      IF NEW.alliance_id IS NOT NULL THEN
        UPDATE public.commercial_alliances 
        SET clients_referred = clients_referred + 1,
            updated_at = now()
        WHERE id = NEW.alliance_id;
      END IF;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrease count when client is deleted
    IF OLD.alliance_id IS NOT NULL THEN
      UPDATE public.commercial_alliances 
      SET clients_referred = clients_referred - 1,
          updated_at = now()
      WHERE id = OLD.alliance_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update alliance statistics
CREATE TRIGGER update_alliance_client_stats
  AFTER INSERT OR UPDATE OR DELETE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_alliance_stats();