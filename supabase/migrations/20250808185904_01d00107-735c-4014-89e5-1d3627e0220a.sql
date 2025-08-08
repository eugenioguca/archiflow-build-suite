-- Add missing primary key to personal_events table
ALTER TABLE public.personal_events 
ADD CONSTRAINT personal_events_pkey PRIMARY KEY (id);