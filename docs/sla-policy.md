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
