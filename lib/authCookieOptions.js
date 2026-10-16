export function authCookieOptions(extra = {}) {
  const domain = process.env.AUTH_COOKIE_DOMAIN?.trim();
  return {
    httpOnly: true,
    path: "/",
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    ...(domain ? { domain } : {}),
    ...extra,
  };
}

export function clearAuthCookie(cookieStore, name) {
  cookieStore.set(name, "", authCookieOptions({ maxAge: 0, expires: new Date(0) }));
}
