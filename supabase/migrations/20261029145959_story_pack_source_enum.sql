-- PostgreSQL requires a committed enum value before constraints or functions
-- use it. Supabase applies each migration in one transaction, so this must
-- remain separate from the Story Pack tables and policies that follow.
alter type public.draft_source add value 'story_pack';
