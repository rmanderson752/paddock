#!/usr/bin/env bash
# Produce a clean copy of the local database for `turso db create --from-file`:
# WAL checkpointed, journal mode reset, search index dropped (the app rebuilds
# it on first search), vacuumed.
#
#   npm run db:export
#   turso db create paddock --from-file data/paddock-export.db
set -euo pipefail

SRC="${DATABASE_PATH:-data/paddock.db}"
OUT="data/paddock-export.db"

if [[ ! -f "$SRC" ]]; then
  echo "No database at $SRC" >&2
  exit 1
fi

rm -f "$OUT" "$OUT-wal" "$OUT-shm"
sqlite3 "$SRC" "PRAGMA wal_checkpoint(TRUNCATE);" > /dev/null
sqlite3 "$SRC" ".backup '$OUT'"
sqlite3 "$OUT" <<'SQL'
PRAGMA journal_mode = DELETE;
DROP TABLE IF EXISTS generations_fts;
VACUUM;
SQL

echo "Wrote $OUT ($(du -h "$OUT" | cut -f1))"
sqlite3 "$OUT" "SELECT 'sales: ' || COUNT(*) FROM sales; SELECT 'generations: ' || COUNT(*) FROM generations; SELECT 'users: ' || COUNT(*) FROM users;"
echo
echo "Next: turso db create paddock --from-file $OUT"
