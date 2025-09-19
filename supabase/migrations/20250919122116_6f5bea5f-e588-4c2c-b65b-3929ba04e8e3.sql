-- Update the service_name check constraint to include notion
ALTER TABLE public.integrations 
DROP CONSTRAINT IF EXISTS integrations_service_name_check;

ALTER TABLE public.integrations 
ADD CONSTRAINT integrations_service_name_check 
CHECK (service_name IN ('jira', 'confluence', 'notion'));