#!/usr/bin/env bash
# Read-only production readiness check for IT RASAM ticketing.
# This script NEVER backs up databases, deploys, changes files, or enables alerts.
set -u
errors=0
check() { if eval "$2" >/dev/null 2>&1; then printf 'PASS: %s\n' "$1"; else printf 'BLOCK: %s\n' "$1"; errors=$((errors+1)); fi; }
printf '=== IT RASAM release preflight (read-only) ===\n'
check 'docker available' 'command -v docker'
check 'git available' 'command -v git'
check 'current project has compose definition' 'test -f docker-compose.yml'
check 'env file exists (contents never printed)' 'test -f .env'
check 'local persisted ticket attachments exist' 'test -d storage/ticket-attachments'
check 'local persisted assessment files exist' 'test -d storage/project-assessments'
check 'local persisted call recordings exist' 'test -d storage/call-recordings'
if command -v docker >/dev/null 2>&1; then
 check 'Docker daemon available' 'docker info'
 check 'ticketing container exists' 'docker inspect itrasam-ticketing'
 check 'phone container exists' 'docker inspect itrasam-phone'
fi
printf '\nManual evidence required before deployment:\n'
printf ' - latest encrypted off-host MongoDB backup, restore tested in isolation\n'
printf ' - backup of all persisted storage paths, size/integrity verified\n'
printf ' - staging auth and data-isolation tests with real MongoDB\n'
printf ' - messaging provider opt-in sandbox test: Bale/Telegram/SMS\n'
printf ' - release revision, rollback owner and last-known-good container image\n'
printf ' - SLA_ALERTS_ENABLED remains false until delivery tests succeed\n'
printf '\nPreflight blocking checks: %s\n' "$errors"
if [ "$errors" -ne 0 ]; then exit 1; fi
exit 0
