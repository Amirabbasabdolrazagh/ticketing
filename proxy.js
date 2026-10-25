import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import refreshAccessToken from "./utils/refreshAccessToken";
import { ACCESS_TOKEN_MAX_AGE } from "./lib/accessTokenLifetime";

export async function proxy(req) {
  const accessToken = req.cookies.get("accessToken")?.value;
  const refreshToken = req.cookies.get("refreshToken")?.value;

  const pathname = req.nextUrl.pathname;
  // Keep other roles' API behavior unchanged. Accountant sessions are
  // explicitly isolated to their archive, identity and own profile endpoints.
  if (pathname.startsWith("/api/")) {
    let claims = null;
    for (const [cookie, secret] of [
      ["accessToken", process.env.ACCESS_TOKEN_SECRET],
      ["refreshToken", process.env.REFRESH_TOKEN_SECRET],
    ]) {
      const value = req.cookies.get(cookie)?.value;
      if (!value || !secret) continue;
      try { claims = jwt.verify(value, secret); break; } catch {}
    }
    if (claims?.role === "accountant") {
      const ownProfile = pathname === `/api/users/${claims.userId}`;
      const allowedIdentity = [
        "/api/auth/me", "/api/auth/logout", "/api/auth/login",
        "/api/auth/refreshToken", "/api/auth/change-password",
        "/api/auth/register-email",
      ].includes(pathname);
      if (!pathname.startsWith("/api/accounting/") && !ownProfile && !allowedIdentity) {
        return NextResponse.json({ success: false, message: "دسترسی غیرمجاز" }, { status: 403 });
      }
    }
    return NextResponse.next();
  }

  let role;
  let profileComplete;
  let newAccessToken = null;
  const cookieDomain = process.env.AUTH_COOKIE_DOMAIN?.trim();

  // 1) Check access token
  if (accessToken) {
    try {
      const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);

      role = decoded.role;
      profileComplete = decoded.profileComplete;
    } catch (error) {
      // accessToken is invalid or expired
      // continue to refreshToken check
    }
  }

  // 2) If accessToken was missing / invalid / expired
  if (!role) {
    if (!refreshToken) {
      return NextResponse.redirect(new URL("/auth", req.url));
    }

    newAccessToken = await refreshAccessToken(refreshToken);

    if (!newAccessToken) {
      return NextResponse.redirect(new URL("/auth", req.url));
    }

    const decoded = jwt.verify(newAccessToken, process.env.ACCESS_TOKEN_SECRET);

    role = decoded.role;
    profileComplete = decoded.profileComplete;
  }

  if (role === "accountant" &&
    !["/accountant/dashboard", "/accountant/setting"].includes(pathname)) {
    const response = NextResponse.redirect(new URL("/accountant/dashboard", req.url));
    if (newAccessToken) response.cookies.set("accessToken", newAccessToken, {
      httpOnly: true, path: "/", maxAge: ACCESS_TOKEN_MAX_AGE,
      sameSite: "strict", secure: process.env.NODE_ENV === "production",
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    });
    return response;
  }

  if (pathname.startsWith("/accountant") && role !== "accountant") {
    return NextResponse.redirect(new URL(role === "admin" ? "/admin/accounting" : `/${role}/dashboard`, req.url));
  }

  const settingsPath = `/${role}/setting`;
  if (profileComplete === false && role !== "organization_manager" && pathname !== settingsPath) {
    const response = NextResponse.redirect(new URL(settingsPath, req.url));
    if (newAccessToken) {
      response.cookies.set("accessToken", newAccessToken, {
        httpOnly: true,
        path: "/",
        maxAge: ACCESS_TOKEN_MAX_AGE,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
        ...(cookieDomain ? { domain: cookieDomain } : {}),
      });
    }
    return response;
  }

  // 3) Role protection
  if (pathname.startsWith("/phone") && !["admin", "agent", "passive_agent", "active_agent"].includes(role)) {
    const response = NextResponse.redirect(new URL(`/${role}/dashboard`, req.url));
    if (newAccessToken) response.cookies.set("accessToken", newAccessToken, { httpOnly: true, path: "/", maxAge: ACCESS_TOKEN_MAX_AGE, sameSite: "strict", secure: process.env.NODE_ENV === "production", ...(cookieDomain ? { domain: cookieDomain } : {}) });
    return response;
  }
  if (pathname.startsWith("/admin") && role !== "admin") {
    const response = NextResponse.redirect(new URL(`/${role}`, req.url));

    if (newAccessToken) {
      response.cookies.set("accessToken", newAccessToken, {
        httpOnly: true,
        path: "/",
        maxAge: ACCESS_TOKEN_MAX_AGE,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
        ...(cookieDomain ? { domain: cookieDomain } : {}),
      });
    }

    return response;
  }

  if (pathname.startsWith("/agent") && role !== "agent") {
    const response = NextResponse.redirect(new URL(`/${role}`, req.url));

    if (newAccessToken) {
      response.cookies.set("accessToken", newAccessToken, {
        httpOnly: true,
        path: "/",
        maxAge: ACCESS_TOKEN_MAX_AGE,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
        ...(cookieDomain ? { domain: cookieDomain } : {}),
      });
    }

    return response;
  }

  if (pathname.startsWith("/customer") && role !== "customer") {
    const response = NextResponse.redirect(new URL(`/${role}`, req.url));

    if (newAccessToken) {
      response.cookies.set("accessToken", newAccessToken, {
        httpOnly: true,
        path: "/",
        maxAge: ACCESS_TOKEN_MAX_AGE,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
        ...(cookieDomain ? { domain: cookieDomain } : {}),
      });
    }

    return response;
  }

  if (pathname.startsWith("/passive_agent") && role !== "passive_agent") {
    const response = NextResponse.redirect(new URL(`/${role}`, req.url));
    if (newAccessToken) response.cookies.set("accessToken", newAccessToken, { httpOnly: true, path: "/", maxAge: ACCESS_TOKEN_MAX_AGE, sameSite: "strict", secure: process.env.NODE_ENV === "production", ...(cookieDomain ? { domain: cookieDomain } : {}) });
    return response;
  }

  if (pathname.startsWith("/active_agent") && role !== "active_agent") {
    const response = NextResponse.redirect(new URL(`/${role}`, req.url));
    if (newAccessToken) response.cookies.set("accessToken", newAccessToken, { httpOnly: true, path: "/", maxAge: ACCESS_TOKEN_MAX_AGE, sameSite: "strict", secure: process.env.NODE_ENV === "production", ...(cookieDomain ? { domain: cookieDomain } : {}) });
    return response;
  }

  if (pathname.startsWith("/organization_manager") && role !== "organization_manager") {
    const response = NextResponse.redirect(new URL(`/${role}`, req.url));
    if (newAccessToken) response.cookies.set("accessToken", newAccessToken, { httpOnly: true, path: "/", maxAge: ACCESS_TOKEN_MAX_AGE, sameSite: "strict", secure: process.env.NODE_ENV === "production", ...(cookieDomain ? { domain: cookieDomain } : {}) });
    return response;
  }

  // 4) Continue request
  const response = NextResponse.next();

  // 5) If refresh happened, store new accessToken
  if (newAccessToken) {
    response.cookies.set("accessToken", newAccessToken, {
      httpOnly: true,
      path: "/",
      maxAge: ACCESS_TOKEN_MAX_AGE,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    });
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/agent/:path*", "/customer/:path*", "/passive_agent/:path*", "/active_agent/:path*", "/organization_manager/:path*", "/phone/:path*", "/accountant/:path*", "/api/:path*"],
};
