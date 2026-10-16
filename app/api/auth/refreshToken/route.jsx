import { cookies } from "next/headers";
import { ACCESS_TOKEN_LIFETIME, ACCESS_TOKEN_MAX_AGE } from "@/lib/accessTokenLifetime";
import jwt from "jsonwebtoken";
import ConnectDb from "@/utils/connectDB";
import User from "@/models/users";
import { authCookieOptions, clearAuthCookie } from "@/lib/authCookieOptions";
export async function POST() {
  const cookieStore = await cookies();
  try {
    const refreshToken = cookieStore.get("refreshToken")?.value;
    if (!refreshToken) {
      return Response.json(
        { success: false, message: "refresh token not provided" },
        { status: 401 },
      );
    }
    let payload;
    try {
      payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    } catch (error) {
      clearAuthCookie(cookieStore, "refreshToken");
      clearAuthCookie(cookieStore, "accessToken");
      return Response.json(
        { success: false, message: "Invalid or expired token" },
        { status: 401 },
      );
    }

    await ConnectDb();
    const user = await User.findById(payload.userId);
    if (!user) {
      clearAuthCookie(cookieStore, "refreshToken");
      clearAuthCookie(cookieStore, "accessToken");
      return Response.json(
        { success: false, message: "user not found" },
        { status: 404 },
      );
    }
    if (user.refreshToken !== refreshToken) {
      clearAuthCookie(cookieStore, "refreshToken");
      clearAuthCookie(cookieStore, "accessToken");
      return Response.json(
        { success: false, message: "invalid refresh token" },
        { status: 401 },
      );
    }

    const newAccessToken = jwt.sign(
      {
        userId: user._id.toString(),
        phone: user.phone,
        role: user.role,
      },
      process.env.ACCESS_TOKEN_SECRET,
      {
        expiresIn: ACCESS_TOKEN_LIFETIME,
      },
    );
    cookieStore.set("accessToken", newAccessToken, authCookieOptions({ maxAge: ACCESS_TOKEN_MAX_AGE }));
    return Response.json(
      {
        success: true,
        message: "accessToken refreshed successfully",
        user: {
          id: user._id.toString(),
          phone: user.phone,
          role : user.role
        },
      },
      { status: 200 },
    );
  } catch (error) {
    clearAuthCookie(cookieStore, "refreshToken");
    clearAuthCookie(cookieStore, "accessToken");
    return Response.json(
      { success: false, message: "server error" },
      { status: 500 },
    );
  }
}
