-- Fixes from the Supabase security and performance advisors (2026-10-28).

-- 1. SECURITY DEFINER bodies move to the private schema, which PostgREST
--    does not expose. The API keeps thin SECURITY INVOKER wrappers with the
--    same names and signatures, so clients call supabase.rpc() unchanged.
alter function public.accept_handoff(uuid) set schema private;
alter function public.decline_handoff(uuid, text) set schema private;
alter function public.owner_transition_job(uuid, public.job_state, text) set schema private;
alter function public.review_content_draft(uuid, boolean) set schema private;

create function public.accept_handoff(p_handoff_id uuid)
returns public.handoffs
language sql security invoker
set search_path = ''
as $$
  select * from private.accept_handoff(p_handoff_id)
$$;

create function public.decline_handoff(p_handoff_id uuid, p_reason text default null)
returns public.handoffs
language sql security invoker
set search_path = ''
as $$
  select * from private.decline_handoff(p_handoff_id, p_reason)
$$;

create function public.owner_transition_job(p_job_id uuid, p_to public.job_state, p_reason text)
returns public.jobs
language sql security invoker
set search_path = ''
as $$
  select * from private.owner_transition_job(p_job_id, p_to, p_reason)
$$;

create function public.review_content_draft(p_draft_id uuid, p_approve boolean)
returns public.content_drafts
language sql security invoker
set search_path = ''
as $$
  select * from private.review_content_draft(p_draft_id, p_approve)
$$;

revoke all on function
  public.accept_handoff(uuid),
  public.decline_handoff(uuid, text),
  public.owner_transition_job(uuid, public.job_state, text),
  public.review_content_draft(uuid, boolean)
from public, anon;
grant execute on function
  public.accept_handoff(uuid),
  public.decline_handoff(uuid, text),
  public.owner_transition_job(uuid, public.job_state, text),
  public.review_content_draft(uuid, boolean)
to authenticated, service_role;

-- 2. Every foreign key gets a covering index (deletes and joins stay fast as
--    tables grow). Composite keys replace the narrower indexes they extend.
drop index public.handoff_events_handoff_idx;
create index handoff_events_handoff_idx on public.handoff_events (handoff_id, tenant_id, at);
drop index public.job_events_job_idx;
create index job_events_job_idx on public.job_events (job_id, tenant_id, at);
drop index public.jobs_handoff_idx;
create index jobs_handoff_idx on public.jobs (handoff_id, tenant_id);
drop index public.conversations_active_handoff_idx;
create index conversations_active_handoff_idx on public.conversations (active_handoff_id, id);

create index consents_source_message_idx on public.consents (source_message_id);
create index content_drafts_reviewed_by_idx on public.content_drafts (reviewed_by);
create index handoff_events_actor_user_idx on public.handoff_events (actor_user_id);
create index job_events_actor_user_idx on public.job_events (actor_user_id);
create index messages_author_user_idx on public.messages (author_user_id);
