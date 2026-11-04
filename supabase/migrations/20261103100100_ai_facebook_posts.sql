alter table public.linked_accounts
  add constraint linked_accounts_id_tenant_unique unique (id, tenant_id);

alter table public.content_drafts
  add column facebook_account_id uuid,
  add column facebook_account_name text check (char_length(facebook_account_name) <= 120),
  add constraint content_drafts_facebook_account_tenant_fk
    foreign key (facebook_account_id, tenant_id)
    references public.linked_accounts (id, tenant_id) on delete set null (facebook_account_id),
  add constraint content_drafts_ai_post_shape check (
    source <> 'ai_post'
    or (
      source_job_id is null
      and cardinality(source_media_ids) = 0
      and slides is null
      and image_path is null
      and scheduled_at is null
      and facebook_account_name is not null
      and platforms = array['facebook_page']::public.social_platform[]
    )
  );

create index content_drafts_facebook_account_tenant_idx
  on public.content_drafts (facebook_account_id, tenant_id);

grant insert (tenant_id, source, source_media_ids, title, caption, platforms, facebook_account_id, facebook_account_name)
  on public.content_drafts to authenticated;
grant update (caption, platforms, title) on public.content_drafts to authenticated;

drop policy content_drafts_insert on public.content_drafts;
create policy content_drafts_insert on public.content_drafts for insert to authenticated
  with check (
    tenant_id in (select private.user_owner_tenant_ids())
    and status = 'draft'
    and reviewed_by is null
    and reviewed_at is null
    and published_at is null
    and image_path is null
    and scheduled_at is null
    and approved_media is null
    and deleted_at is null
    and (
      (source = 'story_pack' and facebook_account_id is null and facebook_account_name is null)
      or (source = 'ai_post' and facebook_account_id is not null and facebook_account_name is not null)
    )
  );

drop policy content_drafts_update on public.content_drafts;
create policy content_drafts_update on public.content_drafts for update to authenticated
  using (
    tenant_id in (select private.user_owner_tenant_ids())
    and status = 'draft'
    and deleted_at is null
  )
  with check (
    tenant_id in (select private.user_owner_tenant_ids())
    and status = 'draft'
    and deleted_at is null
  );

create function private.review_ai_content_draft(
  p_draft_id uuid,
  p_approve boolean,
  p_expected_updated_at timestamptz
)
returns public.content_drafts
language plpgsql security definer
set search_path = ''
as $$
declare
  d public.content_drafts;
begin
  select * into d from public.content_drafts
  where id = p_draft_id and source = 'ai_post' and deleted_at is null
  for update;
  if not found or d.tenant_id not in (select private.user_owner_tenant_ids()) then
    raise exception 'draft not found' using errcode = 'P0002';
  end if;
  if d.status <> 'draft' then
    raise exception 'draft is already %', d.status using errcode = '22023';
  end if;
  if p_approve and (p_expected_updated_at is null or d.updated_at <> p_expected_updated_at) then
    raise exception 'The draft changed. Review it again before approving.' using errcode = 'PT409';
  end if;
  update public.content_drafts
  set status = case when p_approve then 'approved'::public.draft_status else 'rejected'::public.draft_status end,
      reviewed_by = (select auth.uid()),
      reviewed_at = now()
  where id = d.id returning * into d;
  return d;
end
$$;

create function public.review_ai_content_draft(
  p_draft_id uuid,
  p_approve boolean,
  p_expected_updated_at timestamptz
)
returns public.content_drafts
language sql security invoker
set search_path = ''
as $$
  select * from private.review_ai_content_draft(p_draft_id, p_approve, p_expected_updated_at)
$$;

revoke all on function private.review_ai_content_draft(uuid, boolean, timestamptz),
  public.review_ai_content_draft(uuid, boolean, timestamptz) from public, anon;
grant execute on function private.review_ai_content_draft(uuid, boolean, timestamptz)
  to authenticated, service_role;
grant execute on function public.review_ai_content_draft(uuid, boolean, timestamptz)
  to authenticated, service_role;
