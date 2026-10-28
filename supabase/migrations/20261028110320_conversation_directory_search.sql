-- Directory search for the agent, keyed by conversation. The customer's
-- exact location stays in the database: the model never sees or supplies
-- coordinates. service_role only.
--
-- Errors: P0002 the customer has not shared a location yet (ask for it).
create function public.search_directory_for_conversation(
  p_conversation_id uuid,
  p_category text,
  p_exclude uuid[] default '{}',
  p_at timestamptz default now(),
  p_limit integer default 3
)
returns table (
  tenant_id uuid,
  slug text,
  name text,
  rating numeric,
  review_count integer,
  night_jobs boolean,
  open_now boolean,
  distance_km numeric
)
language plpgsql stable security invoker
set search_path = ''
as $$
declare
  v_lat double precision;
  v_lng double precision;
begin
  select extensions.st_y(l.location::extensions.geometry), extensions.st_x(l.location::extensions.geometry)
  into v_lat, v_lng
  from public.customer_locations l
  where l.conversation_id = p_conversation_id
  order by l.shared_at desc
  limit 1;
  if not found then
    raise exception 'customer has not shared a location' using errcode = 'P0002';
  end if;
  return query select * from public.search_directory(p_category, v_lat, v_lng, p_at, p_exclude, p_limit);
end
$$;

revoke all on function public.search_directory_for_conversation(uuid, text, uuid[], timestamptz, integer)
  from public, anon, authenticated;
grant execute on function public.search_directory_for_conversation(uuid, text, uuid[], timestamptz, integer)
  to service_role;
