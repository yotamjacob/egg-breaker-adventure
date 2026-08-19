-- send-notifications accepts an `x-cron-secret` header (v3.10.11). The value
-- lives in Supabase Vault under the name 'cron_secret' and is mirrored into
-- the CRON_SECRET function secret; nothing secret is in this file. Until the
-- Vault entry exists the header is sent empty and the function stays open
-- (it only enforces once CRON_SECRET is set), so applying this migration on
-- its own changes nothing. To enable:
--   supabase db query --linked "select vault.create_secret('<random>','cron_secret')"
--   supabase secrets set CRON_SECRET=<same random>
-- Then check: select * from cron.job_run_details order by start_time desc limit 5;
select cron.unschedule('send-push-notifications');

select cron.schedule(
  'send-push-notifications',
  '*/15 * * * *',
  $$
  select net.http_post(
    url     := 'https://hhpikvqeopscjdzuhbfk.supabase.co/functions/v1/send-notifications',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhocGlrdnFlb3BzY2pkenVoYmZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMzA2NDUsImV4cCI6MjA5MTcwNjY0NX0.-iYI6Wf8eREEBKFxfty7ot1Ke8AqjC73xlT7KCTZaqc',
      'x-cron-secret', coalesce((select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret' limit 1), '')
    ),
    body    := '{}'::jsonb
  );
  $$
);
