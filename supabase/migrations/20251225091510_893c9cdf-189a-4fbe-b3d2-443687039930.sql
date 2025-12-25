-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule auto-confirm-orders to run daily at 2 AM UTC
SELECT cron.schedule(
  'auto-confirm-orders-daily',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://sgpefhfmcykwtfqfwzcq.supabase.co/functions/v1/auto-confirm-orders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNncGVmaGZtY3lrd3RmcWZ3emNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NjI2NzUsImV4cCI6MjA4MDMzODY3NX0.qYiFr5kI2UK4uLyw57lvvX-pZsYdiYo1x0E7U9FsSEQ"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);