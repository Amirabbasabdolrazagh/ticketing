# IT RASAM — safe rollout checklist

This repository serves the existing support/ticketing system and the optional phone service. **No GitHub PR, CI job, or merge in this document deploys to production.**

## Before each release

1. Review the PR; run `npm ci`, `npm test`, `npm run lint`, and `npm run build` in a clean environment. Never use production credentials in CI.
2. Test in an isolated staging environment against a **sanitized database copy**, not the live customer database. Confirm user roles: admin, agent, customer and organization_manager.
3. Verify that a customer can access only their own tickets and an organization manager only their organization's data. Test both reads and writes/attachments.
4. **Back up and verify** a consistent snapshot of the actual MongoDB instance (including all databases/collections used by ticketing), plus persisted `storage/ticket-attachments`, `storage/project-assessments`, and `storage/call-recordings`. Confirm remote-support/phone persistence separately if enabled. Database location is external to `docker-compose.yml`; backing up only Docker volumes or Git is insufficient.
5. Encrypt backup artifacts, store them off-host with restricted access, record recovery point, and test restoration in an isolated environment before the first production rollout.
6. Confirm available disk space, backup retention, maintenance/rollback owner, and non-destructive migrations. Never overwrite production data to test a restore.
7. Use a versioned release/commit, capture current application and image versions, and take a second snapshot before any schema migration.
8. After the rollout, check application health, login and OTP, ticket creation, assignment, replies, files, organization boundaries, alerts and phone-related operations if enabled.

## Rollback approach

- Roll back application images to the recorded last-known-good release when a code-only regression occurs.
- Restore the database **only** when required for a data migration or data corruption and after assessing writes received since the snapshot; do not silently overwrite new customer tickets.
- Prefer backward-compatible, additive database changes and feature flags to avoid data rollback.
- Keep staging and production secrets out of source control, PRs and logs.

## Monitoring metrics contract

- **ثبت تا مشاهده**: ticket.createdAt -> ticket.agentViewedAt.
- **تخصیص تا مشاهده**: ticket.assignedAt -> ticket.agentViewedAt (tracked separately, never substituted for registration time).
- **مشاهده تا پاسخ**: ticket.agentViewedAt -> ticket.agentFirstReplyAt.
- Missing or invalid timestamps produce a null metric; negative differences are clamped to zero to avoid a negative duration.

## Release status

- This document and the verification workflow prepare for releases; they **do not** assert staging exists, backups have been taken, CI is passing, or production is updated.
