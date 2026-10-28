#!/usr/bin/env bash
# Applies supabase/migrations and seed.sql to a throwaway PostGIS container,
# then runs supabase/tests/*.test.sql. Needs Docker. Exits non-zero on the
# first failing assertion.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
image="${PG_IMAGE:-postgis/postgis:17-3.5}"
name="zukki-db-test-$$"

docker run -d --rm --name "$name" -e POSTGRES_PASSWORD=postgres "$image" >/dev/null
trap 'docker rm -f "$name" >/dev/null 2>&1 || true' EXIT

# The image runs init scripts on a socket-only server first; wait for TCP.
for _ in $(seq 1 60); do
  docker exec "$name" pg_isready -h 127.0.0.1 -U postgres -q && break
  sleep 1
done

psql() {
  docker exec -i -e PGPASSWORD=postgres "$name" \
    psql -h 127.0.0.1 -U postgres -v ON_ERROR_STOP=1 -q -X "$@"
}

# template0: the image preinstalls PostGIS into public of the default DBs.
psql -d postgres -c "create database zukki_test template template0"

run() {
  echo "-- $1"
  psql -d zukki_test -f - < "$root/$1"
}

run supabase/tests/supabase-stub.sql
for migration in "$root"/supabase/migrations/*.sql; do
  run "supabase/migrations/$(basename "$migration")"
done
run supabase/seed.sql
for test in "$root"/supabase/tests/*.test.sql; do
  run "supabase/tests/$(basename "$test")"
done

echo "database tests passed"
