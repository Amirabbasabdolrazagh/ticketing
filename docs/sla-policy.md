# SLA policy — first delivery

- An admin can read/write the contract SLA policy using:
  - `GET /api/admin/organizations/{organizationId}/sla`
  - `PUT /api/admin/organizations/{organizationId}/sla`
- The write endpoint expects a JSON policy: `{"enabled":true,"mode":"24x7","targets":{"low":{"responseMinutes":180,"resolveMinutes":1440},"medium":{"responseMinutes":60,"resolveMinutes":480},"high":{"responseMinutes":15,"resolveMinutes":120}}}`.
- **These values are illustrative only, never installed as defaults.** The administrator must set actual contractual targets. Policy is disabled by default.
- Present support is 24×7 elapsed time only. Business-hour schedules, holidays, pauses, event alerts, UI editing and escalation are pending; they must not be represented as implemented.
- A new ticket started by an assigned organization customer receives a snapshot of the current policy only if organization and contract are active and policy enabled.
- Both the response due date and resolution due date are recorded without modifying the existing manually configured ticket deadline. Changing a policy does not retroactively adjust past ticket commitments.
- A timestamp is recorded when the ticket transitions to resolved. Existing resolved tickets without a historical `resolvedAt` timestamp must not be fabricated; handle historical migration only after explicit data review.
- Admin monitoring API now includes SLA status for applicable new tickets. Do not display false SLA breaches for legacy tickets.
- Only admin can configure. Use tenant-safe authorization for any future customer-facing SLA report.

## Production rollout precautions

No changes are active until merged and deployed. Test with a staging customer organization, a configured active contract, and a ticket. Ensure default-disabled contracts create no SLA snapshot, and manually configured deadlines remain unchanged.

## Outstanding tests

- Role authorization for all endpoints.
- Org membership changes and creation through non-portal channels.
- Event-based SLA alerts and business hours.
- Contract history/version changes.
- Staging/prod Mongo compatibility and end-to-end ticket flow.


## Admin UI and monitoring additions

- Open `/admin/sla` to choose an organization, enter response and resolution minutes for each priority and enable/disable the policy.
- Open `/admin/monitoring` for SLA coverage, due-soon counts (30 minutes), and overdue response/resolution counts.
- No SLA is applied retroactively and it is not inferred for contracts without explicitly configured targets.

## Sending alerts

- The existing authenticated scheduler `POST /api/internal/ticket-attention` also evaluates SLA warnings and breaches.
- Set `SLA_ALERTS_ENABLED=true` **only after** verifying the scheduler already runs periodically and messaging is configured. Default is disabled.
- An SLA warning is attempted once per ticket/type while 0–30 minutes remain; a breach is attempted when overdue. Agents and admins are notified by existing messaging/SMS providers.
- Alerts use conditional MongoDB claims and stored timestamps to reduce duplicates between simultaneous scheduler runs. If no recipient/provider reports success, the claim is released for retry.
- Delivery outcome is currently at-least-once on some crash/failure boundaries; guaranteed exactly-once messaging, robust per-recipient outbox, and alert delivery audits are future work.
- No application-side background scheduling was added. Without a configured scheduler, alerts are not automatically fired. The same scheduler must not be exposed without its Bearer secret.

## Remaining work

- Business-hours/holiday-aware SLA, SLA pause/reopen policy, extended escalation stages and per-recipient delivery logs.
- Historical reconciliation for old resolved tickets without `resolvedAt`, plus integration tests for ticket resolution and role isolation.

## Working-hours scheduling

- The policy supports `mode: "business-hours"` with an explicit weekly schedule and an array of Gregorian `YYYY-MM-DD` closed dates (Iran's official holidays are **not** auto-fetched).
- The timezone is `Asia/Tehran`; MongoDB timestamps and due dates are UTC instants. Each weekday is numbered Sunday=0 to Saturday=6, using `null` for non-working days.
- Weekly shifts must fit within one calendar day with end strictly later than start; overnight shifts, exception working days, pauses and multiple shifts/day are not yet supported.
- Business-hours policy data is frozen on each new ticket; changing an organization's schedule only changes **future** tickets.
- The UI suggests regular shifts as editable examples, not contractual commitments. An admin must verify the actual weekly schedule, holiday closures, and SLA targets before activating a customer agreement.
