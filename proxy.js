import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import refreshAccessToken from "./utils/refreshAccessToken";

export async function proxy(req) {
  const accessToken = req.cookies.get("accessToken")?.value;
  const refreshToken = req.cookies.get("refreshToken")?.value;

  const pathname = req.nextUrl.pathname;

  let role;
  let profileComplete;
  let newAccessToken = null;

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

  const settingsPath = `/${role}/setting`;
  if (profileComplete === false && pathname !== settingsPath) {
    const response = NextResponse.redirect(new URL(settingsPath, req.url));
    if (newAccessToken) {
      response.cookies.set("accessToken", newAccessToken, {
        httpOnly: true,
        path: "/",
        maxAge: 15 * 60,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
      });
    }
    return response;
  }

  // 3) Role protection
  if (pathname.startsWith("/admin") && role !== "admin") {
    const response = NextResponse.redirect(new URL(`/${role}`, req.url));

    if (newAccessToken) {
      response.cookies.set("accessToken", newAccessToken, {
        httpOnly: true,
        path: "/",
        maxAge: 15 * 60,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
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
        maxAge: 15 * 60,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
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
        maxAge: 15 * 60,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
      });
    }

    return response;
  }

  if (pathname.startsWith("/passive_agent") && role !== "passive_agent") {
    const response = NextResponse.redirect(new URL(`/${role}`, req.url));
    if (newAccessToken) response.cookies.set("accessToken", newAccessToken, { httpOnly: true, path: "/", maxAge: 15 * 60, sameSite: "strict", secure: process.env.NODE_ENV === "production" });
    return response;
  }

  if (pathname.startsWith("/active_agent") && role !== "active_agent") {
    const response = NextResponse.redirect(new URL(`/${role}`, req.url));
    if (newAccessToken) response.cookies.set("accessToken", newAccessToken, { httpOnly: true, path: "/", maxAge: 15 * 60, sameSite: "strict", secure: process.env.NODE_ENV === "production" });
    return response;
  }

  // 4) Continue request
  const response = NextResponse.next();

  // 5) If refresh happened, store new accessToken
  if (newAccessToken) {
    response.cookies.set("accessToken", newAccessToken, {
      httpOnly: true,
      path: "/",
      maxAge: 15 * 60,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/agent/:path*", "/customer/:path*", "/passive_agent/:path*", "/active_agent/:path*"],
};
