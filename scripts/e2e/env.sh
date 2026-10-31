# Sourced by the e2e scripts: the local API env (META_APP_SECRET) and the local Supabase URLs.
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
set -a
. "$root/apps/api/.env.local"
eval "$(cd "$root" && npx supabase status -o env 2>/dev/null | grep -E '^(API_URL|ANON_KEY|DB_URL|MAILPIT_URL)=')"
set +a
