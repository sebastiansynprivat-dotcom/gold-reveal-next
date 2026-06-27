
SELECT cron.schedule(
  'chatter-pulse-pushes-every-30min',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://acznyhzgbkdcmnbqvptt.supabase.co/functions/v1/chatter-pulse-pushes',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjem55aHpnYmtkY21uYnF2cHR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NjE3OTksImV4cCI6MjA4ODAzNzc5OX0.pr2hG5yfGU_4A5-gIPRUF0sVFB6plva3N66TPHiT-q0"}'::jsonb,
    body := jsonb_build_object('time', now())
  );
  $$
);
