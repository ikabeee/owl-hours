-- Story Packs: explicit original-photo assignment, saved copy and owner review.
-- This PR has not been deployed. Keep its schema/functions coherent here;
-- the new enum value is committed by the preceding migration.
alter table public.jobs add constraint jobs_id_conversation_unique unique (id, conversation_id);
alter table public.media
  add column job_id uuid,
  add column story_role text check (story_role in ('before', 'after')),
  add column job_assigned_by uuid references auth.users(id) on delete set null,
  add column job_assigned_at timestamptz,
  add constraint media_job_conversation_fk foreign key (job_id, conversation_id)
    references public.jobs (id, conversation_id) on delete set null (job_id);
create index media_job_conversation_role_idx
  on public.media (job_id, conversation_id, story_role) where job_id is not null;
create index media_job_assigned_by_idx on public.media(job_assigned_by) where job_assigned_by is not null;
alter table public.content_drafts
  add column slides jsonb,
  add column approved_media jsonb,
  add column deleted_at timestamptz,
  add constraint content_drafts_story_pack_source
    check (source <> 'story_pack' or source_job_id is not null or deleted_at is not null);

create function private.content_drafts_set_deleted_at()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.source = 'story_pack' and old.source_job_id is not null and new.source_job_id is null then
    new.deleted_at := coalesce(new.deleted_at, now());
  end if;
  return new;
end;
$$;
revoke all on function private.content_drafts_set_deleted_at() from public;

create trigger content_drafts_apply_logical_delete
  before update on public.content_drafts
  for each row execute function private.content_drafts_set_deleted_at();

-- This is the sole revision implementation. UUID storage paths are immutable
-- in the writers (upsert:false); URL signature rotation does not change it.
create function private.story_media_revision(p_storage_path text)
returns text language sql immutable strict set search_path = ''
as $$ select encode(sha256(convert_to(p_storage_path, 'UTF8')), 'hex') $$;
revoke all on function private.story_media_revision(text) from public, anon;
grant execute on function private.story_media_revision(text) to authenticated, service_role;

-- One owner-scoped job/consent/ambiguity decision for the picker, assignment,
-- source discovery and review. Definer visibility sees other tenants' handoff
-- history, but rows are returned only for this user's owner memberships.
create function private.story_pack_assignment_jobs(p_job_ids uuid[] default null)
returns table (
  id uuid, tenant_id uuid, conversation_id uuid, business_name text,
  job_title text, updated_at timestamptz, granted boolean, consent_at timestamptz,
  blocked_reason text
)
language sql stable security definer set search_path = ''
as $$
  select j.id, j.tenant_id, j.conversation_id, t.name, j.title, j.updated_at,
    consent.granted, consent.at,
    case when not coalesce(consent.granted, false) then 'consent_required'
      when exists (select 1 from public.handoffs other_h
        where other_h.conversation_id = j.conversation_id
          and other_h.tenant_id <> j.tenant_id and other_h.status in ('accepted', 'closed'))
      then 'ambiguous_conversation' else null end
  from public.jobs j
  join public.tenants t on t.id = j.tenant_id
  join public.handoffs h on h.id = j.handoff_id
    and h.tenant_id = j.tenant_id and h.conversation_id = j.conversation_id
  left join lateral (select c.granted, c.at from public.consents c
    where c.conversation_id = j.conversation_id and c.kind = 'photos_for_marketing'
    order by c.at desc, c.id desc limit 1) consent on true
  where j.tenant_id in (select private.user_owner_tenant_ids())
    and j.state = 'done' and h.status in ('accepted', 'closed')
    and (p_job_ids is null or j.id = any(p_job_ids))
$$;

-- Original-photo predicate is shared by source discovery and assignment.
-- Invoker visibility remains the caller's table/RLS visibility.
create function private.story_pack_original_media(p_job_id uuid, p_conversation_id uuid)
returns setof public.media language sql stable security invoker set search_path = ''
as $$
  select m.* from public.media m
  where m.conversation_id = p_conversation_id and (m.job_id is null or m.job_id = p_job_id)
    and m.kind = 'image' and m.derived_from_media_id is null
    and m.role in ('evidence', 'job_photo', 'before_photo', 'after_photo')
$$;

create function private.story_pack_is_eligible(p_job_id uuid, p_tenant_id uuid, p_media_ids uuid[])
returns boolean language sql stable security invoker set search_path = ''
as $$
  select exists (select 1 from private.story_pack_assignment_jobs(array[p_job_id]) j
    where j.tenant_id = p_tenant_id and j.blocked_reason is null
      and cardinality(p_media_ids) = 2
      and (select count(distinct m.id) = 2
        and bool_or(m.story_role = 'before') and bool_or(m.story_role = 'after')
        from private.story_pack_original_media(j.id, j.conversation_id) m
        where m.id = any(p_media_ids) and m.job_id = j.id and m.story_role in ('before', 'after')))
$$;

create function private.story_pack_media_snapshot(p_job_id uuid, p_media_ids uuid[])
returns jsonb language sql stable security invoker set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', m.id, 'role', m.story_role, 'revision', private.story_media_revision(m.storage_path))
    order by m.id::text collate "C"), '[]'::jsonb)
  from public.media m where m.job_id = p_job_id and m.id = any(p_media_ids)
    and m.story_role in ('before', 'after')
$$;
revoke all on function private.story_pack_assignment_jobs(uuid[]),
  private.story_pack_original_media(uuid, uuid), private.story_pack_is_eligible(uuid, uuid, uuid[]),
  private.story_pack_media_snapshot(uuid, uuid[]) from public, anon;
grant execute on function private.story_pack_assignment_jobs(uuid[]),
  private.story_pack_original_media(uuid, uuid), private.story_pack_is_eligible(uuid, uuid, uuid[]),
  private.story_pack_media_snapshot(uuid, uuid[]) to authenticated, service_role;

-- Filter exact draft jobs before applying the picker limit.
create function public.owner_content_sources(p_limit integer default 50, p_job_ids uuid[] default null)
returns jsonb language sql stable security invoker set search_path = ''
as $$
  select coalesce(jsonb_agg(s.item order by s.updated_at desc, s.id), '[]'::jsonb)
  from (select j.id, j.updated_at, jsonb_build_object(
    'id', j.id, 'businessId', j.tenant_id, 'businessName', j.business_name,
    'jobTitle', j.job_title, 'state', 'done', 'shareConsent', 'yes',
    'assets', (select coalesce(jsonb_agg(jsonb_build_object(
      'id', m.id, 'role', m.story_role, 'storagePath', m.storage_path, 'thumbPath', m.thumb_path,
      'revision', private.story_media_revision(m.storage_path))
      order by case m.story_role when 'before' then 0 else 1 end, m.id), '[]'::jsonb)
      from private.story_pack_original_media(j.id, j.conversation_id) m
      where m.job_id = j.id and m.story_role in ('before', 'after'))
  ) item
  from private.story_pack_assignment_jobs(p_job_ids) j
  -- A source only needs one before and one after; the draft then selects exactly
  -- one of each, which story_pack_is_eligible enforces on the selection.
  where j.blocked_reason is null
    and exists (select 1 from private.story_pack_original_media(j.id, j.conversation_id) m
      where m.job_id = j.id and m.story_role = 'before')
    and exists (select 1 from private.story_pack_original_media(j.id, j.conversation_id) m
      where m.job_id = j.id and m.story_role = 'after')
  order by j.updated_at desc, j.id
  limit greatest(1, least(coalesce(p_limit, 50), 100))) s
$$;
revoke all on function public.owner_content_sources(integer, uuid[]) from public, anon;
grant execute on function public.owner_content_sources(integer, uuid[]) to authenticated, service_role;

create function private.owner_content_photo_jobs(p_limit integer default 100)
returns jsonb language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', j.id, 'businessName', j.business_name, 'jobTitle', j.job_title,
    'shareConsent', case when j.granted is null then 'not_asked' when j.granted then 'yes' else 'no' end,
    'consentRecordedAt', j.consent_at, 'assignmentBlockedReason', j.blocked_reason,
    'assets', case when j.blocked_reason is not null then '[]'::jsonb else (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', m.id, 'role', coalesce(m.story_role, 'unassigned'), 'storagePath', m.storage_path)
        order by m.created_at, m.id), '[]'::jsonb)
      from private.story_pack_original_media(j.id, j.conversation_id) m) end
  ) order by j.updated_at desc, j.id), '[]'::jsonb)
  from (select * from private.story_pack_assignment_jobs()
    order by updated_at desc, id limit greatest(1, least(coalesce(p_limit, 100), 100))) j
$$;
create function public.owner_content_photo_jobs(p_limit integer default 100)
returns jsonb language sql stable security invoker set search_path = ''
as $$ select private.owner_content_photo_jobs(p_limit) $$;

create function private.owner_assign_content_photos(p_job_id uuid, p_before_media_id uuid, p_after_media_id uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare locked_job public.jobs; j record; eligible_count integer;
begin
  -- Assignment and approval share a stable lock order: job, then media ids.
  select job.* into locked_job from public.jobs job
    join public.handoffs h on h.id = job.handoff_id and h.tenant_id = job.tenant_id
    where job.id = p_job_id and job.tenant_id in (select private.user_owner_tenant_ids())
    for update of job, h;
  if not found then raise exception 'Completed job not found.' using errcode = 'P0002'; end if;
  if p_before_media_id is null or p_after_media_id is null or p_before_media_id = p_after_media_id then
    raise exception 'Choose distinct before and after photos.' using errcode = '23514';
  end if;
  perform m.id from public.media m where m.id in (p_before_media_id, p_after_media_id)
    and m.conversation_id = locked_job.conversation_id order by m.id for update;
  -- Evaluate current eligibility after any lock wait, once.
  select * into j from private.story_pack_assignment_jobs(array[p_job_id]);
  if not found then raise exception 'Completed job not found.' using errcode = 'P0002'; end if;
  if j.blocked_reason is not null then
    raise exception 'Current consent and unambiguous photo ownership are required.' using errcode = '23514';
  end if;
  select count(*) into eligible_count from private.story_pack_original_media(j.id, j.conversation_id) m
    where m.id in (p_before_media_id, p_after_media_id);
  if eligible_count <> 2 then
    raise exception 'Choose original photos from this job; photos assigned elsewhere cannot be moved.' using errcode = '23514';
  end if;
  -- Story choices never alter evidence/job-photo roles or their original audit.
  update public.media set story_role = null
    where job_id = j.id and story_role is not null and id not in (p_before_media_id, p_after_media_id);
  update public.media m set
    story_role = case when m.id = p_before_media_id then 'before' else 'after' end,
    job_id = coalesce(m.job_id, j.id),
    job_assigned_by = case when m.job_id is null then (select auth.uid()) else m.job_assigned_by end,
    job_assigned_at = case when m.job_id is null then now() else m.job_assigned_at end
    where m.id in (p_before_media_id, p_after_media_id);
  return jsonb_build_object('jobId', j.id, 'beforeMediaId', p_before_media_id, 'afterMediaId', p_after_media_id);
end
$$;
create function public.owner_assign_content_photos(p_job_id uuid, p_before_media_id uuid, p_after_media_id uuid)
returns jsonb language sql security invoker set search_path = ''
as $$ select private.owner_assign_content_photos(p_job_id, p_before_media_id, p_after_media_id) $$;
revoke all on function private.owner_content_photo_jobs(integer), private.owner_assign_content_photos(uuid, uuid, uuid),
  public.owner_content_photo_jobs(integer), public.owner_assign_content_photos(uuid, uuid, uuid) from public, anon;
grant execute on function private.owner_content_photo_jobs(integer), private.owner_assign_content_photos(uuid, uuid, uuid),
  public.owner_content_photo_jobs(integer), public.owner_assign_content_photos(uuid, uuid, uuid) to authenticated, service_role;

create function private.valid_story_slides(p_slides jsonb)
returns boolean
language plpgsql immutable
set search_path = ''
as $$
declare slide jsonb;
begin
  if p_slides is null or jsonb_typeof(p_slides) <> 'array' then return false; end if;
  if jsonb_array_length(p_slides) <> 3 then return false; end if;
  for slide in select value from jsonb_array_elements(p_slides)
  loop
    if jsonb_typeof(slide) <> 'object'
       or jsonb_typeof(slide -> 'title') is distinct from 'string'
       or jsonb_typeof(slide -> 'body') is distinct from 'string'
       or slide - 'title' - 'body' <> '{}'::jsonb
       or char_length(slide ->> 'title') not between 1 and 60
       or char_length(slide ->> 'body') not between 1 and 280
       or (slide ->> 'title') !~ '[^[:space:]]'
       or (slide ->> 'body') !~ '[^[:space:]]' then
      return false;
    end if;
  end loop;
  return true;
end;
$$;
revoke all on function private.valid_story_slides(jsonb) from public;
grant execute on function private.valid_story_slides(jsonb) to authenticated, service_role;


alter table public.content_drafts
  add constraint content_drafts_slides_shape check (slides is null or private.valid_story_slides(slides)),
  drop constraint content_drafts_platforms_check,
  add constraint content_drafts_platforms_check check (cardinality(platforms) between
    case when source = 'story_pack' and status in ('draft', 'rejected') then 0 else 1 end and 2),
  add constraint content_drafts_story_pack_ready check (source <> 'story_pack' or status not in ('approved', 'published')
    or (private.valid_story_slides(slides) and cardinality(platforms) >= 1 and approved_media is not null));
revoke insert on public.content_drafts from authenticated;
grant insert (tenant_id, source, source_job_id, source_media_ids, title, caption, platforms, slides),
  update (slides) on public.content_drafts to authenticated;
create policy content_drafts_insert on public.content_drafts for insert to authenticated
  with check (tenant_id in (select private.user_owner_tenant_ids()) and status = 'draft'
    and reviewed_by is null and reviewed_at is null and published_at is null
    and image_path is null and scheduled_at is null and approved_media is null and source = 'story_pack'
    and deleted_at is null);
drop policy if exists content_drafts_update on public.content_drafts;
create policy content_drafts_update on public.content_drafts for update to authenticated
  using (tenant_id in (select private.user_owner_tenant_ids()) and status = 'draft' and deleted_at is null)
  with check (tenant_id in (select private.user_owner_tenant_ids()) and status = 'draft' and deleted_at is null);

-- Preserve the older content scheduling/publication workflow.
create function private.check_story_pack_manual_delivery()
returns trigger language plpgsql set search_path = ''
as $$ begin
  if new.source = 'story_pack' and (new.scheduled_at is not null or new.status = 'published' or new.image_path is not null) then
    raise exception 'Story Packs support manual handoff only' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger content_drafts_story_pack_manual_delivery before insert or update on public.content_drafts
  for each row execute function private.check_story_pack_manual_delivery();

create or replace function private.check_draft_media()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare bad uuid;
begin
  if new.deleted_at is not null then
    return new;
  end if;

  if new.source <> 'story_pack' then
    -- Preserve the existing behavior for one-image job drafts and price posts.
    select s.media_id into bad
    from unnest(new.source_media_ids) as s(media_id)
    left join public.media m on m.id = s.media_id
    where m.id is null
       or not exists (
         select 1 from public.handoffs h
         where h.conversation_id = m.conversation_id
           and h.tenant_id = new.tenant_id
           and h.status in ('accepted', 'closed')
       )
       or not coalesce((
         select c.granted from public.consents c
         where c.conversation_id = m.conversation_id and c.kind = 'photos_for_marketing'
         order by c.at desc, c.id desc limit 1
       ), false)
    limit 1;
    if found then
      raise exception 'media % needs the customer''s consent and must come from this business''s own job', bad
        using errcode = '23514';
    end if;
    return new;
  end if;


  if not private.story_pack_is_eligible(new.source_job_id, new.tenant_id, new.source_media_ids) then
    raise exception 'Story Pack needs current consent and exact before/after photos from this completed job' using errcode = '23514';
  end if;
  return new;
end $$;
drop trigger content_drafts_check_media on public.content_drafts;
create trigger content_drafts_check_media
  before insert or update of source_media_ids, tenant_id, source_job_id, source on public.content_drafts
  for each row execute function private.check_draft_media();

-- The two existing arguments still work for older T6 content sources. Story
-- Packs require the optional version + media arguments to approve; callers
-- cannot bypass the guard through the legacy RPC signature.
drop function public.review_content_draft(uuid, boolean);
drop function private.review_content_draft(uuid, boolean);
create function private.review_content_draft(p_draft_id uuid, p_approve boolean,
  p_expected_updated_at timestamptz default null, p_expected_media jsonb default null)
returns public.content_drafts language plpgsql security definer set search_path = ''
as $$
declare
  d public.content_drafts;
  current_media jsonb;
  expected_media jsonb;
begin
  select * into d from public.content_drafts where id = p_draft_id for update;
  if not found or d.tenant_id not in (select private.user_owner_tenant_ids()) or d.deleted_at is not null then
    raise exception 'draft not found' using errcode = 'P0002';
  end if;
  if d.status <> 'draft' then
    raise exception 'draft is already %', d.status using errcode = '22023';
  end if;
  if p_approve and d.source = 'story_pack' then
    if p_expected_updated_at is null or jsonb_typeof(p_expected_media) is distinct from 'array' then
      raise exception 'Story Pack approval needs the displayed draft and photos' using errcode = '23514';
    end if;
    -- Domain conflicts must not use 40001: PostgREST treats that code as
    -- transient and can retry the same rejected approval indefinitely.
    if d.updated_at <> p_expected_updated_at then
      raise exception 'The draft changed. Review it again before approving.' using errcode = 'PT409';
    end if;
    -- Lock the job and selected media until approval commits, so assignment
    -- changes cannot slip between the snapshot comparison and status update.
    perform j.id from public.jobs j where j.id = d.source_job_id for update;
    perform m.id from public.media m where m.id = any(d.source_media_ids) order by m.id for update;
    if not private.story_pack_is_eligible(d.source_job_id, d.tenant_id, d.source_media_ids) then
      raise exception 'the source photos are no longer eligible for sharing' using errcode = '23514';
    end if;
    current_media := private.story_pack_media_snapshot(d.source_job_id, d.source_media_ids);
    select jsonb_agg(value order by (value ->> 'id')::uuid::text collate "C")
    into expected_media from jsonb_array_elements(p_expected_media);
    if current_media is distinct from expected_media then
      raise exception 'The selected photos changed. Review them again before approving.' using errcode = 'PT409';
    end if;
  end if;
  update public.content_drafts
  set status = case when p_approve then 'approved'::public.draft_status else 'rejected'::public.draft_status end,
    reviewed_by = (select auth.uid()), reviewed_at = now(),
    approved_media = case when p_approve and d.source = 'story_pack' then current_media else null end
  where id = d.id returning * into d;
  return d;
end
$$;
create function public.review_content_draft(p_draft_id uuid, p_approve boolean,
  p_expected_updated_at timestamptz default null, p_expected_media jsonb default null)
returns public.content_drafts language sql security invoker set search_path = ''
as $$ select * from private.review_content_draft(p_draft_id, p_approve, p_expected_updated_at, p_expected_media) $$;
revoke all on function private.review_content_draft(uuid, boolean, timestamptz, jsonb),
  public.review_content_draft(uuid, boolean, timestamptz, jsonb) from public, anon;
grant execute on function private.review_content_draft(uuid, boolean, timestamptz, jsonb),
  public.review_content_draft(uuid, boolean, timestamptz, jsonb) to authenticated, service_role;
