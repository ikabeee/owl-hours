-- Muse posts belong to one linked Page and need an explicit, current-version approval.
\set ON_ERROR_STOP 1
\set mario '{"sub":"20000000-0000-4000-8000-000000000001","role":"authenticated"}'
\set eastside '{"sub":"20000000-0000-4000-8000-000000000002","role":"authenticated"}'

begin;
set local role authenticated;
set local request.jwt.claims to :'mario';
do $$
declare
  account_id uuid;
  draft_id uuid;
  draft public.content_drafts;
begin
  select id into account_id from public.linked_accounts where external_id = '100000000000001';
  assert account_id is not null, 'Northside Page is missing';

  insert into public.content_drafts (
    tenant_id, source, source_media_ids, title, caption, platforms, facebook_account_id, facebook_account_name
  ) values (
    '10000000-0000-4000-8000-000000000001', 'ai_post', '{}'::uuid[], 'AI post fixture',
    'A post written for the selected Page.', array['facebook_page']::public.social_platform[], account_id,
    'Northside Plumbing (test Page)'
  ) returning id into draft_id;

  select * into draft from public.content_drafts where id = draft_id;
  begin
    perform public.review_ai_content_draft(draft.id, true, draft.updated_at - interval '1 second');
    raise exception 'stale AI post was approved';
  exception when sqlstate 'PT409' then null;
  end;
  begin
    update public.content_drafts set scheduled_at = now() + interval '1 day' where id = draft_id;
    raise exception 'AI post scheduling was allowed';
  exception when check_violation then null;
  end;
  draft := public.review_ai_content_draft(draft.id, true, draft.updated_at);
  assert draft.status = 'approved' and draft.reviewed_by = auth.uid(), 'owner approval was not recorded';
end $$;
reset role;

set local role authenticated;
set local request.jwt.claims to :'eastside';
do $$ begin
  assert not exists (select 1 from public.content_drafts where title = 'AI post fixture'),
    'another business can see the AI post';
end $$;
rollback;
