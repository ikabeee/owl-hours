# Zukki — Entity-Relationship diagram

Source of truth: `supabase/migrations/0001_init.sql`.
`J` marks a jsonb column.

```text
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  businesses  │   │  customers   │   │ technicians  │
│──────────────│   │──────────────│   │──────────────│
│ PK id        │   │ PK id        │   │ PK id        │
│ name         │   │ wa_id UNIQUE │   │ FK business  │
│ phone_num_id │   │ display_name │   │ name         │
│ area         │   │ approx_loc   │   │ van_stock    │ J
│ night_hours  │   │ exact_addr * │   │ last_loc     │ J
└──────┬───────┘   └──────┬───────┘   └──────┬───────┘
       │ 1                │ 1                │ 1
       │ N                │ N                │ N (nullable)
┌──────┴──────────────────┴──────────────────┴───────┐
│                       jobs                        │
│───────────────────────────────────────────────────│
│ PK id · FK business · FK customer · FK technician │
│ state · urgency(now/today/week) · category· title │
│ diagnosis · arrival_window · quote J · created    │
└──────┬──────────┬───────────┬───────────┬────────┘
       │ 1        │ 1         │ 1           │ 1
       │ N        │ N         │ N           │ N
┌──────┴─────┐ ┌──┴────────┐ ┌┴──────────┐ ┌┴────────┐
│job_evidence│ │job_events │ │ messages  │ │consents │
│────────────│ │───────────│ │───────────│ │─────────│
│PK id       │ │PK id      │ │PK id      │ │PK id    │
│FK job      │ │FK job     │ │FK job     │ │FK job   │
│media_id    │ │actor **   │ │direction  │ │kind     │
│kind †      │ │type       │ │wa_msg_id  │ │granted  │
│transcript  │ │payload J  │ │type·body  │ │at       │
│sam_detec J │ │at         │ │at         │ └─────────┘
│signals J   │ └───────────┘ └───────────┘
└────────────┘
```

`price_rules` hangs off `businesses` (1—N): `item`, kind
(`callout | night_fee | repair_range`), `min/max_cents`, `notes`.

Notes:

- `*` `exact_address` stays null until `customer_approved`
  (location privacy).
- `**` actor is `agent | owner | customer | system`; the table is the
  audit log of every transition.
- `†` evidence kind is `video | voice | photo | frame`.
