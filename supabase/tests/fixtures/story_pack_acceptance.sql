-- Only used in the disposable acceptance database, never a hosted project.
update public.jobs set state='done', title='Synthetic acceptance repair'
where id='80000000-0000-4000-8000-000000000001';
insert into public.media(id, conversation_id, kind, role, storage_path, mime_type)
values
('60000000-0000-4000-8000-000000000091','40000000-0000-4000-8000-000000000001','image','evidence','conversations/40000000-0000-4000-8000-000000000001/acceptance-before.png','image/png'),
('60000000-0000-4000-8000-000000000092','40000000-0000-4000-8000-000000000001','image','evidence','conversations/40000000-0000-4000-8000-000000000001/acceptance-after.png','image/png'),
('60000000-0000-4000-8000-000000000093','40000000-0000-4000-8000-000000000001','image','evidence','conversations/40000000-0000-4000-8000-000000000001/acceptance-other.png','image/png');
