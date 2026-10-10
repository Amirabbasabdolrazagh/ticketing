import User from "@/models/users";
import ConnectDb from "@/utils/connectDB";
import bcrypt from "bcrypt";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { isProfileComplete } from "@/utils/profileCompletion";
import { ACCESS_TOKEN_LIFETIME, ACCESS_TOKEN_MAX_AGE } from "@/lib/accessTokenLifetime";
export async function POST(req) {
  try {
    const { email, phone, password } = await req.json();
    await ConnectDb();

    const hasEmail = typeof email === "string" && email.trim();
    const hasPhone = typeof phone === "string" && phone.trim();
    if ((!hasEmail && !hasPhone) || typeof password !== "string" || !password) {
      return Response.json(
        {
          success: false,
          message: "شماره موبایل یا ایمیل و رمز عبور الزامی است",
        },
        { status: 400 },
      );
    }
    if (hasPhone && !/^09\d{9}$/.test(phone.trim())) {
      return Response.json(
        { success: false, message: "شماره موبایل معتبر نیست" },
        { status: 400 },
      );
    }

    const user = await User.findOne(
      hasPhone
        ? { phone: phone.trim() }
        : { email: email.trim().toLowerCase() },
    ).select("+password");


    if (!user) {
      return Response.json(
        { success: false, message: hasPhone ? "شماره موبایل یا رمز عبور نادرست است" : "ایمیل یا رمز عبور نادرست است" },
        { status: 401 },
      );
    }
    if (!user.password) {
      return Response.json(
        { success: false, message: "برای این حساب رمز عبور تعریف نشده است؛ از کد یک‌بارمصرف استفاده کنید" },
        { status: 400 },
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return Response.json(
        {
          success: false,
          message: hasPhone ? "شماره موبایل یا رمز عبور نادرست است" : "ایمیل یا رمز عبور نادرست است",
        },
        {
          status: 401,
        },
      );
    }
    // Generate new tokens

    const profileComplete = isProfileComplete(user.name);
    const accessPayload = {
      userId: user._id.toString(),

      phone: user.phone,

      role: user.role,
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
    user.lastLoginAt = new Date();
    await user.save();

    // Set new cookies

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
        message: "ورود با موفقیت انجام شد",
        user: {
          id: user._id.toString(),
          name: user.name,
          phone: user.phone,
          role: user.role,
          email: user.email,
          profileComplete,
        },
      },

      { status: 200 },
    );
  } catch (error) {
    console.error("PASSWORD LOGIN ERROR:", error);

    return Response.json(
      {
        success: false,
        message: "server error",
      },

      { status: 500 },
    );
  }
}
