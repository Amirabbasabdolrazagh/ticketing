import User from "@/models/users";
import ConnectDB from "@/utils/connectDB";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
export async function POST() {
  try {
    await ConnectDB();
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("refreshToken")?.value;
    if (!refreshToken) {
      return Response.json(
        { success: false, message: "refresh token not found" },
        { status: 401 },
      );
    }

    const payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    const user = await User.findByIdAndUpdate(payload.userId, {
      $unset: { refreshToken: "" },
    });
    if (!user) {
      cookieStore.delete("refreshToken");
      cookieStore.delete("accessToken");

      return Response.json(
        { success: false, message: "user not found" },
        { status: 404 },
      );
    }
    cookieStore.delete("refreshToken", {
      path: "/",
    });
    cookieStore.delete("accessToken", {
      path: "/",
    });

    return Response.json(
      { success: true, message: "Logged out successfully" },
      { status: 200 },
    );
  } catch (error) {
    return Response.json(
      { success: false, message: "Invalid or expired refresh token" },

      { status: 401 },
    );
  }
}
