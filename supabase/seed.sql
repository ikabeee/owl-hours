-- Demo seed: Northside Plumbing, Mario R., Ana L.
-- Demo numbers: visit $45 + night fee $25 + repair $60-90 = $130-160.
-- Arrival window 12:40-1:10 AM; after pickup detour 12:55-1:25 AM.

insert into businesses (name, phone_number_id, area, night_hours, accepts_night_jobs)
values ('Northside Plumbing', 'TODO_PHONE_NUMBER_ID', 'Northside, 1.2 km', '8pm-6am', true);

insert into technicians (business_id, name, van_stock, status)
select id, 'Mario R.', '{"fill_valve": 0}', 'on_duty'
from businesses where name = 'Northside Plumbing';

insert into customers (wa_id, display_name, approx_location, exact_address)
values ('TODO_ANA_WA_ID', 'Ana L.', '1.2 km away', null);

insert into price_rules (business_id, item, kind, min_cents, max_cents, notes)
select id, item, kind, min_cents, max_cents, notes
from businesses,
  (values
    ('Visit', 'callout', 4500, 4500, 'Flat visit fee'),
    ('Night fee', 'night_fee', 2500, 2500, '8pm-6am surcharge'),
    ('Fill valve repair', 'repair_range', 6000, 9000, 'Estimate, excludes floor damage')
  ) as rules (item, kind, min_cents, max_cents, notes)
where name = 'Northside Plumbing';
