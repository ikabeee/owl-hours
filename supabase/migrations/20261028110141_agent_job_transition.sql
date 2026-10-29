-- Agent and customer job moves, recorded by the API (service_role) after
-- the TypeScript validator in packages/shared/src/job-states.ts accepts
-- them. Compare-and-set on the state the API read, so two workers can
-- never both move the same job; the audit row commits with the change.
--
-- Errors: P0002 job missing, 40001 the job changed since it was read
-- (re-read and retry), 22023 owner moves (they use owner_transition_job).
create function public.record_job_transition(
  p_job_id uuid,
  p_from public.job_state,
  p_to public.job_state,
  p_actor public.job_actor,
  p_reason text
)
returns public.jobs
language plpgsql security invoker
set search_path = ''
as $$
declare
  j public.jobs;
begin
  if p_actor = 'owner' then
    raise exception 'owner moves go through owner_transition_job' using errcode = '22023';
  end if;
  if p_reason is null or char_length(p_reason) not between 1 and 500 then
    raise exception 'a reason of 1-500 characters is required' using errcode = '22023';
  end if;

  update public.jobs set state = p_to
  where id = p_job_id and state = p_from
  returning * into j;
  if not found then
    if exists (select 1 from public.jobs where id = p_job_id) then
      raise exception 'job % is no longer %', p_job_id, p_from using errcode = '40001';
    end if;
    raise exception 'job not found' using errcode = 'P0002';
  end if;

  insert into public.job_events (job_id, tenant_id, actor, from_state, to_state, reason)
  values (j.id, j.tenant_id, p_actor, p_from, p_to, p_reason);
  return j;
end
$$;

revoke all on function public.record_job_transition(uuid, public.job_state, public.job_state, public.job_actor, text)
  from public, anon, authenticated;
grant execute on function public.record_job_transition(uuid, public.job_state, public.job_state, public.job_actor, text)
  to service_role;
