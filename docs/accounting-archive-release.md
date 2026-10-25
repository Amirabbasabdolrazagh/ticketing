# Accounting document archive — isolated release

The accounting archive is available only to:
- `admin` at `/admin/accounting`
- `accountant` at `/accountant/dashboard` (plus account settings)

All archive API handlers check the database-backed authenticated user, rather than trusting client menus.
Accountant access to unrelated API endpoints is blocked by `proxy.js`.
Changing a user's role also invalidates stale access tokens through `getCurrentUser()`.

## Document categories

- `quarterly_transactions` — معاملات فصلی
- `tax_vat` — مالیات و ارزش افزوده
- `purchase_invoice` — فاکتور خرید
- `sales_invoice` — فاکتور فروش

Supported uploads: files whose content begins with PDF, JPEG, PNG, or WebP signatures, up to 15 MiB. Files are stored outside `/public`, under `storage/accounting-archive`, with randomized keys and restrictive file permissions. A persisted Docker bind mount is configured for the ticketing service only. Do not share this directory with web-server static assets.

## Pre-release checklist (required)

1. Verify production server availability, Git worktree status and current deployed revision.
2. Back up the MongoDB database **and** project configuration and existing persisted attachment directories to restricted storage; verify that the backup is readable.
3. Create `storage/accounting-archive` on the host and ensure UID/GID 1001 (the `nextjs` container user) has write permission. Ensure this directory is covered by production backups.
4. Ensure the branch is based on the deployed code and that unrelated uncommitted production changes are not overwritten.
5. Build the ticketing Docker image using the exact production env/build configuration, and check for compilation or lint failures.
6. Deploy only `ticketing`; leave `phone`, PBX, call recording, and transcription services unchanged.
7. Verify health checks and the operational phone/ticket/login workflows before considering release complete.

## Authorization smoke tests (required)

With separate authenticated sessions for admin, accountant, agent and customer:
- Admin: archive page and all CRUD/download actions succeed.
- Accountant: archive page and archive CRUD/download succeed; profile update and logout work.
- Accountant: `/admin/users`, `/admin/tickets`, `/phone`, `/api/users`, `/api/tickets`, and other unrelated APIs are forbidden.
- Agent/customer: `/admin/accounting`, `/accountant/dashboard`, `/api/accounting/documents` and download requests are forbidden.
- No credentials: archive APIs return HTTP 401 and never return file bytes.
- Invalid MIME signatures, oversized files, invalid category/date, and invalid IDs are rejected.
- Downloads are authenticated, have `no-store` and `nosniff` headers, and do not expose storage paths.
- Confirm a document persists after re-creating the ticketing container and remains in backup storage.

**Never publish the branch without these checks.** Keep the last known-good image for immediate rollback if post-deployment verification fails.
