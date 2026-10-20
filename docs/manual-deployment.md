# IT RASAM ticketing — manual production release

**Do not deploy until backup and restoration have been verified on an isolated target.** GitHub CI tests use mocks; they do not prove production MongoDB, messaging providers or organization isolation end to end.

## 1. Read-only inspection on the production Linux host

Run in the existing application checkout, not a newly cloned folder:

```bash
pwd
git remote -v
git status --short
git rev-parse HEAD
docker compose config --services
docker compose ps
docker inspect itrasam-ticketing --format '{{.Image}} {{.State.Status}}' 2>/dev/null || true
df -h
```

The phone, voice transcription, ticketing and any external MongoDB may be running on separate hosts. Identify the DB topology before backup. Do not publish the contents of .env or connection credentials.

## 2. Create consistent database and storage backups

Set a **private** directory with sufficient space and off-host replication. Never use git stash, git reset --hard, docker compose down -v, or a database restore as a routine deployment action.

- Create a consistent `mongodump --archive --gzip` with `--uri` taken securely from the actual `DATABASE_URI`. If MongoDB runs in a replica set, coordinate snapshot timing and use `--oplog` where supported by mongodump mode and privileges. Confirm the archive lists expected collections by `mongorestore --archive=... --gzip --dryRun` where supported and **test a real restore to an isolated database/host**.
- Archive and hash these persistent paths: `storage/ticket-attachments`, `storage/project-assessments`, `storage/call-recordings`; assess any additional persistent phone/remote support directories.
- Encrypt and copy backups off-host. Never expose a copy of customer files or database to CI or public chat.
- Record commit SHA and images of all running Compose services. Ensure backups are not accidentally included in Docker build context.

## 3. Test staging before touching production

- Build and launch the exact candidate commit with sanitized data and staging credentials.
- Confirm admin-only SLA GET/PUT; `customer`, `agent` and `organization_manager` must receive HTTP 403.
- Verify organization A cannot access organization B's tickets or files.
- Check a ticket with enabled SLA, admin reply, agent reply, resolution, manual deadline, and working-hours/holiday rollover.
- Run `npm test`, `npm run lint`, `npm run build` and the project's `scripts/release-preflight.sh` (read-only). Check Build and runtime logs.
- For provider messaging, use explicitly approved **test recipients**. Do not turn on `SLA_ALERTS_ENABLED` for real users before confirming delivery. There is no provider-level exactly-once guarantee.
- Check that the protected scheduler endpoint runs with its existing `TICKET_ATTENTION_SECRET`; no scheduler will be created by this PR.

## 4. Production deployment, only after 1–3 are complete

1. Merge the approved PR (or identify an exact, successful, approved commit) and verify the deployment checkout is clean. Record the old commit for rollback.
2. Retain the existing `.env`, running service configuration and Docker volumes. This is an additive schema change and does not require an automatic data migration.
3. Rebuild and replace only the ticketing service first. **Do not use** `docker compose down`, `docker compose down -v`, `docker volume prune`, `git reset --hard`, or restart phone/voice services unnecessarily.
4. Keep SLA alerts disabled initially. Verify ticketing login, new ticket, reply, reassignment, attachments, SLA policy page, monitoring and existing PBX/phone app functionality.
5. With approved recipients and provider credentials, exercise one isolated SLA test case. Only then enable alerts and verify the cron/scheduler frequency and logs.

A code rollback switches to the recorded previous image/commit and recreates the ticketing container while **preserving** data. A database rollback is only a disaster recovery operation after protecting intervening customer writes.

## Known scope limits

- Working-hours calendar has one daytime shift per weekday, optional explicit Gregorian closed dates; holidays are not fetched automatically.
- SLA notification timestamps are claims, not full provider-level per-recipient audit records; a partial provider failure can require manual follow-up.
- Existing unresolved/old tickets do not automatically acquire SLA; historic data is not fabricated.
- CI unit tests with mock database/provider do not replace real environment integration tests.
