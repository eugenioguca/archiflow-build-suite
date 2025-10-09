-- Extend event_alerts table for push notification system
-- Add fields for tracking notification delivery status

ALTER TABLE public.event_alerts 
ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'push' CHECK (channel IN ('push', 'email', 'in_app')),
ADD COLUMN IF NOT EXISTS due_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed', 'cancelled')),
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS error TEXT;

-- Create index for efficient querying of pending notifications
CREATE INDEX IF NOT EXISTS idx_event_alerts_status_due_at 
ON public.event_alerts(status, due_at) 
WHERE status = 'queued' AND due_at IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.event_alerts.due_at IS 'Absolute UTC timestamp when the notification should be sent';
COMMENT ON COLUMN public.event_alerts.status IS 'Current status of the notification in the delivery pipeline';