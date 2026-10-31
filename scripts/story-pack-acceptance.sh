#!/usr/bin/env bash
# Synthetic, local acceptance: product client -> HTTP API -> PostgREST -> SQL.
# Auth and Storage are explicit local fixtures, not real Supabase services.
# Usage: NODE_BIN=/path/to/node bash scripts/story-pack-acceptance.sh [--serve]
# --serve leaves the local browser fixture running until this process exits.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
name="zukki-story-acceptance-$$"
db="${name}-db"
rest="${name}-rest"
password="synthetic-local-password"
jwt_secret="synthetic-local-jwt-secret-at-least-32-bytes"
cleanup() {
  docker rm -f "$rest" "$db" >/dev/null 2>&1 || true
  docker network rm "$name" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker network create "$name" >/dev/null
docker run -d --rm --platform linux/amd64 --name "$db" --network "$name" --network-alias db \
  -e POSTGRES_PASSWORD="$password" postgis/postgis:17-3.5 >/dev/null
for _ in $(seq 1 60); do
  docker exec "$db" pg_isready -h 127.0.0.1 -U postgres -q && break
  sleep 1
done
psql() {
  docker exec -i -e PGPASSWORD="$password" "$db" psql -h 127.0.0.1 -U postgres -v ON_ERROR_STOP=1 -q -X "$@"
}
psql -d postgres -c 'create database zukki_acceptance template template0'
psql -d zukki_acceptance -f - < "$root/supabase/tests/supabase-stub.sql"
for migration in "$root"/supabase/migrations/*.sql; do
  psql -d zukki_acceptance --single-transaction -f - < "$migration"
done
psql -d zukki_acceptance -f - < "$root/supabase/seed.sql"
psql -d zukki_acceptance -f - < "$root/supabase/tests/fixtures/story_pack_acceptance.sql"
docker run -d --rm --name "$rest" --network "$name" -p 127.0.0.1::3000 \
  -e PGRST_DB_URI="postgres://postgres:$password@db:5432/zukki_acceptance" \
  -e PGRST_DB_SCHEMAS=public -e PGRST_DB_ANON_ROLE=anon -e PGRST_JWT_SECRET="$jwt_secret" \
  postgrest/postgrest:v12.2.3 >/dev/null
rest_address="$(docker port "$rest" 3000/tcp)"
STORY_ACCEPTANCE_DB="$db" STORY_ACCEPTANCE_REST="http://$rest_address" \
STORY_ACCEPTANCE_JWT_SECRET="$jwt_secret" \
  "${NODE_BIN:-node}" "$root/apps/api/test/story-pack-live.acceptance.ts" "$@"
