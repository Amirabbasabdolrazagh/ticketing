import User from "@/models/users";
import ConnectDb from "@/utils/connectDB";
import { cookies } from "next/headers";
import { ACCESS_TOKEN_LIFETIME, ACCESS_TOKEN_MAX_AGE } from "@/lib/accessTokenLifetime";
import jwt from "jsonwebtoken";
import { isProfileComplete } from "@/utils/profileCompletion";
export async function POST(req) {
  try {
    await ConnectDb();
    const { phone, code } = await req.json();
    const user = await User.findOne({ phone });
    if (!user) {
      return Response.json(
        { success: false, message: "کاربر با این شماره ثبت نشده" },
        { status: 404 },
      );
    }
    if (user.otp.expiresAt < new Date().getTime()) {
      user.otp = null;
      await user.save();
      return Response.json(
        {
          success: false,
          message: "کد یکبار مصرف منقضی شده است، لطفاً یک کد جدید دریافت کنید.",
        },
        { status: 400 },
      );
    }

    if (user.otp.code !== code) {
      return Response.json({ success: false, message: "invalid otp code" },{ status: 400 },);
    }
    const profileComplete = isProfileComplete(user.name);
    const accessPayload = {
      userId: user._id.toString(),
      phone: user.phone,
      role : user.role,
      profileComplete,
    };
    const accessToken = jwt.sign(
      accessPayload,
      process.env.ACCESS_TOKEN_SECRET,
      {
        expiresIn: ACCESS_TOKEN_LIFETIME,
      },
    );
    const refreshToken = jwt.sign(
      accessPayload,
      process.env.REFRESH_TOKEN_SECRET,
      {
        expiresIn: "7d",
      },
    );
    user.refreshToken = refreshToken;
    user.otp = null;
    user.isVerify = true;
    user.lastLoginAt = new Date();
    await user.save();

    const cookieStore = await cookies();
    cookieStore.set("accessToken", accessToken, {
      httpOnly: true,
      path: "/",
      maxAge: ACCESS_TOKEN_MAX_AGE,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });

    cookieStore.set("refreshToken", refreshToken, {
      httpOnly: true,
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });

    return Response.json(
      {
        success: true,
        message: "otp code accepted",
        user: {
          id: user._id.toString(),
          name: user.name,
          phone: user.phone,
          role: user.role,
          profileComplete,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.log(error);
    return Response.json(
      {
        success: false,
        message: "server error",
      },
      { status: 500 },
    );
  }
}
