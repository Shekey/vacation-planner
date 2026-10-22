#!/usr/bin/env bash
# Nightly backup: dump the database, check the dump can be read, encrypt it to the age recipients.
# Usage: scripts/backup/dump.sh <database-url> <recipients-file> <output.dump.age>
# The plain dump never leaves the machine; only the encrypted file is written to <output>.
set -euo pipefail

url="$1"
recipients="$2"
out="$3"

if ! grep -q '^age1' "$recipients"; then
  echo "No age public key in $recipients. Add one line starting with age1 (see docs/backups.md)." >&2
  exit 1
fi

plain="$(mktemp)"
trap 'rm -f "$plain"' EXIT

# Custom format: compressed, and pg_restore can restore one table from it.
# No owners or grants: Neon role names differ between projects and branches.
pg_dump --format=custom --no-owner --no-acl --file="$plain" "$url"

# A dump that pg_restore can't list is worthless; fail now rather than on the day it's needed.
tables="$(pg_restore --list "$plain" | grep -c ' TABLE DATA ' || true)"
if [ "$tables" -eq 0 ]; then
  echo "The dump has no table data." >&2
  exit 1
fi

age --encrypt --recipients-file "$recipients" --output "$out" "$plain"
echo "Dumped $tables tables, encrypted $(stat -c %s "$out") bytes to $out"
