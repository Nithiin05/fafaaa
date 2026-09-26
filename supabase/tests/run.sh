#!/usr/bin/env bash
# Rebuilds a scratch database from all migrations + seeds, then runs the given SQL test files.
# Usage: tests/run.sh [test.sql ...]   (needs a local Postgres on socket $PGSOCK, port $PGPORT)
set -e
cd "$(dirname "$0")/.."
PGSOCK=${PGSOCK:-/var/tmp/aaipg}; PGPORT=${PGPORT:-5499}
PSQL="psql -h $PGSOCK -p $PGPORT -U postgres -q -X"
su postgres -c "$PSQL -c 'drop database if exists aai' -c 'create database aai'" >/dev/null
cat tests/supabase_stub.sql migrations/*.sql seed/*.sql > $PGSOCK/all.sql
su postgres -c "$PSQL -v ON_ERROR_STOP=1 -d aai -f $PGSOCK/all.sql" && echo "== migrations + seed OK =="
for f in "$@"; do cp "$f" $PGSOCK/t.sql; chmod a+r $PGSOCK/t.sql; echo "== $f =="; su postgres -c "$PSQL -d aai -f $PGSOCK/t.sql" 2>&1; done
