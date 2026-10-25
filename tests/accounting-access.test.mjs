import test from "node:test";
import assert from "node:assert/strict";
import { canAccessAccounting, accountantApiAllowed } from "../lib/accountingAccessPolicy.mjs";

test("only admin and accountant can use the accounting archive", () => {
  assert.equal(canAccessAccounting("admin"), true);
  assert.equal(canAccessAccounting("accountant"), true);
  for (const role of ["agent", "customer", "passive_agent", "active_agent", "organization_manager", "", null]) {
    assert.equal(canAccessAccounting(role), false);
  }
});
test("accountant may use the archive and only its own account APIs", () => {
  const id = "507f191e810c19729de860ea";
  for (const path of [
    "/api/accounting/documents",
    "/api/accounting/documents/507f191e810c19729de860eb",
    "/api/accounting/documents/507f191e810c19729de860eb/file",
    "/api/auth/me",
    "/api/auth/logout",
    "/api/auth/change-password",
    "/api/auth/register-email",
    "/api/users/" + id,
  ]) assert.equal(accountantApiAllowed(path, id), true, path);
  for (const path of [
    "/api/users",
    "/api/users/507f191e810c19729de860eb",
    "/api/users/" + id + "/any",
    "/api/tickets",
    "/api/phone",
    "/api/organizations",
    "/api/leads",
    "/api/live-chat/presence",
    "/api/notifications",
    "/api/accounting",
    "/api/auth/password-reset/request",
    "/api/auth/password-reset/confirm",
    "/api/users/" + id + "/../admin",
  ]) assert.equal(accountantApiAllowed(path, id), false, path);
});
