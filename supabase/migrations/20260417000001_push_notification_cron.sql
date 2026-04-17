-- Schedule send-notifications edge function every hour via pg_cron + pg_net
-- pg_cron and pg_net are enabled by default on Supabase

select cron.schedule(
  'send-push-notifications',
  '0 * * * *',
  $$
  select net.http_post(
    url     := 'https://hhpikvqeopscjdzuhbfk.supabase.co/functions/v1/send-notifications',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhocGlrdnFlb3BzY2pkenVoYmZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMzA2NDUsImV4cCI6MjA5MTcwNjY0NX0.-iYI6Wf8eREEBKFxfty7ot1Ke8AqjC73xlT7KCTZaqc'
    ),
    body    := '{}'::jsonb
  );
  $$
);
