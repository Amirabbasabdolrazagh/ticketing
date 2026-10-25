export const ACCOUNTING_ROLES = Object.freeze(["admin", "accountant"]);
export const canAccessAccounting = (role) => ACCOUNTING_ROLES.includes(role);

// Deliberately small allowlist: accountants have no access to tickets,
// calls, organizations, other users, or their APIs.
export function accountantApiAllowed(pathname, userId) {
  if (typeof pathname !== "string" || typeof userId !== "string" || !userId) return false;
  if (pathname.startsWith("/api/accounting/")) return true;
  if (pathname === "/api/users/" + userId) return true;
  return new Set([
    "/api/auth/me",
    "/api/auth/logout",
    "/api/auth/login",
    "/api/auth/refreshToken",
    "/api/auth/change-password",
    "/api/auth/register-email",
  ]).has(pathname);
}
