import User from "@/models/users";
import ConnectDb from "@/utils/connectDB";
import bcrypt from "bcrypt";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { isProfileComplete } from "@/utils/profileCompletion";
export async function POST(req) {
  try {
    const { email, password } = await req.json();
    await ConnectDb();

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return Response.json(
        {
          success: false,
          message: "email and password are required",
        },
        { status: 400 },
      );
    }
    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    }).select("+password");


    if (!user) {
      return Response.json(
        { success: false, message: "invalid email or password" },
        { status: 401 },
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return Response.json(
        {
          success: false,
          message: "invalid email or password",
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
        expiresIn: "15m",
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
      maxAge: 15 * 60,
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
        message: "user logged in successfully",
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
    console.error("EMAIL LOGIN ERROR:", error);

    return Response.json(
      {
        success: false,
        message: "server error",
      },

      { status: 500 },
    );
  }
}
