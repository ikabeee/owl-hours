-- pg_cron runs the handoff timer (see the platform migration). Skipped
-- where the extension is not available, e.g. the plain-Postgres test run.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
  end if;
end
$$;
