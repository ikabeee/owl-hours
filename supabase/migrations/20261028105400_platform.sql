-- Supabase platform wiring: Realtime, Storage and the handoff timer.
-- Each block checks the platform piece exists, so the schema tests can run
-- on plain Postgres + PostGIS.

-- Realtime: the owner app listens for new requests and chat messages.
-- postgres_changes respects the RLS policies above.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.handoffs, public.messages, public.jobs;
  end if;
end
$$;

-- Storage: private buckets. Paths:
--   media/conversations/<conversation_id>/<file>   customer videos, voice notes, marked frames
--   content/tenants/<tenant_id>/<file>              marketing images
-- Uploads come from the server (service_role); owners only read.
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values
      ('media', 'media', false, 104857600,
       array['video/mp4', 'video/3gpp', 'audio/ogg', 'audio/mpeg', 'audio/aac', 'audio/wav',
             'image/jpeg', 'image/png', 'image/webp']),
      ('content', 'content', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
    on conflict (id) do nothing;

    create policy media_objects_select on storage.objects
      for select to authenticated
      using (
        bucket_id = 'media'
        and (storage.foldername(name))[1] = 'conversations'
        and (storage.foldername(name))[2] in (
          select v::text from private.visible_conversation_ids() as v
        )
      );

    create policy content_objects_select on storage.objects
      for select to authenticated
      using (
        bucket_id = 'content'
        and (storage.foldername(name))[1] = 'tenants'
        and (storage.foldername(name))[2] in (
          select t::text from private.user_tenant_ids() as t
        )
      );
  end if;
end
$$;

-- Handoff timer. Enable pg_cron in the dashboard (Database > Extensions)
-- before this migration, or run expire_handoffs() from the Platform API.
-- accept_handoff() also checks the deadline, so a late cron tick never
-- lets a late accept through.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('expire-handoffs', '* * * * *', 'select public.expire_handoffs()');
  end if;
end
$$;
