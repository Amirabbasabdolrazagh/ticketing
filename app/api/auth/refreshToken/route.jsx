import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import ConnectDb from "@/utils/connectDB";
import User from "@/models/users";
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
      cookieStore.delete("refreshToken", {
        path: "/",
      });
      cookieStore.delete("accessToken", {
        path: "/",
      });
      return Response.json(
        { success: false, message: "Invalid or expired token" },
        { status: 401 },
      );
    }

    await ConnectDb();
    const user = await User.findById(payload.userId);
    if (!user) {
      cookieStore.delete("refreshToken", { path: "/" });
      cookieStore.delete("accessToken", { path: "/" });
      return Response.json(
        { success: false, message: "user not found" },
        { status: 404 },
      );
    }
    if (user.refreshToken !== refreshToken) {
      cookieStore.delete("refreshToken", { path: "/" });
      cookieStore.delete("accessToken", { path: "/" });
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
        expiresIn: "15m",
      },
    );
    cookieStore.set("accessToken", newAccessToken, {
      httpOnly: true,
      path: "/",
      maxAge: 15 * 60,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });
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
    cookieStore.delete("refreshToken", { path: "/" });
    cookieStore.delete("accessToken", { path: "/" });
    return Response.json(
      { success: false, message: "server error" },
      { status: 500 },
    );
  }
}
