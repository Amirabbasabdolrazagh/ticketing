import User from "@/models/users";
import getCurrentUser from "@/utils/auth";
import authorization from "@/utils/authorization";
import ConnectDb from "@/utils/connectDB";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { ACCESS_TOKEN_LIFETIME, ACCESS_TOKEN_MAX_AGE } from "@/lib/accessTokenLifetime";
import {
  isProfileComplete,
  normalizeFullName,
} from "@/utils/profileCompletion";

async function refreshUserSession(userInfo) {
  const profileComplete = isProfileComplete(userInfo.name);
  const payload = {
    userId: userInfo._id.toString(),
    phone: userInfo.phone,
    role: userInfo.role,
    profileComplete,
  };
  const accessToken = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_LIFETIME,
  });
  const refreshToken = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: "7d",
  });
  userInfo.refreshToken = refreshToken;
  await userInfo.save();

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

  return profileComplete;
}

export async function PATCH(req, { params }) {
  const { phone, name, role } = await req.json();
  try {
    await ConnectDb();
    const { userId } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return Response.json(
        { success: false, message: "user unauthorized" },
        { status: 401 },
      );
    }
    const allowedRole = authorization(user, ["admin", "agent", "passive_agent", "active_agent", "customer"]);
    if (!allowedRole) {
      return Response.json(
        { success: false, message: "Forbbiden" },
        { status: 403 },
      );
    }

    if (phone === undefined && name === undefined && role === undefined) {
      return Response.json(
        { success: false, message: "at least one field is required" },
        { status: 400 },
      );
    } else {
      const isSelfUpdate = user._id.toString() === userId;
      if (isSelfUpdate) {
        const finalName = name === undefined ? user.name : normalizeFullName(name);
        if (!isProfileComplete(finalName)) {
          return Response.json(
            {
              success: false,
              message: "وارد کردن نام و نام خانوادگی الزامی است",
            },
            { status: 400 },
          );
        }
      }
      let response;

      if (user.role == "admin") {
        const userInfo = await User.findById(userId);
        if (!userInfo) {
          return Response.json(
            { success: false, message: "user not found" },
            { status: 404 },
          );
        }
        if (name !== undefined) {
          userInfo.name = normalizeFullName(name);
        }
        if (phone !== undefined) {
          userInfo.phone = phone;
        }
        if (role !== undefined) {
          if (["admin", "customer", "agent", "passive_agent", "active_agent"].includes(role)) {
            userInfo.role = role;
          } else {
            return Response.json(
              { success: false, message: "invalid role" },
              { status: 400 },
            );
          }
        }
        await userInfo.save();
        const profileComplete = isSelfUpdate
          ? await refreshUserSession(userInfo)
          : isProfileComplete(userInfo.name);
        response = Response.json(
          {
            success: true,
            message: "اطلاعات کاربری با موفقیت ذخیره شد",
            userInfo,
            profileComplete,
          },
          { status: 200 },
        );
      } else if (user.role === "customer" && user._id.toString() === userId) {
        const userInfo = await User.findById(userId);
        if (!userInfo) {
          return Response.json(
            { success: false, message: "user not found" },
            { status: 404 },
          );
        }
        if (role !== undefined) {
          return Response.json(
            { success: false, message: "Unauthorized access" },
            { status: 403 },
          );
        }
        if (name !== undefined) {
          userInfo.name = normalizeFullName(name);
        }
        if (phone !== undefined) {
          userInfo.phone = phone;
        }

        await userInfo.save();
        const profileComplete = await refreshUserSession(userInfo);
        response = Response.json(
          {
            success: true,
            message: "اطلاعات کاربری با موفقیت ذخیره شد",
            userInfo,
            profileComplete,
          },
          { status: 200 },
        );
      } else if (user.role == "agent" && user._id.toString() === userId) {
        const userInfo = await User.findById(userId);
        if (!userInfo) {
          return Response.json(
            { success: false, message: "user not found" },
            { status: 404 },
          );
        }
        if (role !== undefined) {
          return Response.json(
            { success: false, message: "Unauthorized access" },
            { status: 403 },
          );
        }
        if (name !== undefined) {
          userInfo.name = normalizeFullName(name);
        }
        if (phone !== undefined) {
          userInfo.phone = phone;
        }

        await userInfo.save();
        const profileComplete = await refreshUserSession(userInfo);
        response = Response.json(
          {
            success: true,
            message: "اطلاعات کاربری با موفقیت ذخیره شد",
            userInfo,
            profileComplete,
          },
          { status: 200 },
        );
      } else {
        response = Response.json(
          { success: false, message: "Forbbiden" },
          { status: 403 },
        );
      }
      return response;
    }
  } catch (error) {
    return Response.json(
      { success: false, message: "server error" },
      { status: 500 },
    );
  }
}
export async function GET(req, { params }) {
  try {
    await ConnectDb();
    const { userId } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return Response.json(
        { success: false, message: "user unauthorized" },
        { status: 401 },
      );
    }

    const isAllowedRole = authorization(user, ["admin"]);

    if (!isAllowedRole) {
      return Response.json(
        { success: false, message: "Forbidden" },
        { status: 403 },
      );
    }

    const findUser = await User.findById(userId);
    if (!findUser) {
      return Response.json(
        { success: false, message: "user not found" },
        { status: 404 },
      );
    }
    const safeInfo = {
      userId: findUser._id.toString(),
      name: findUser.name,
      phone: findUser.phone,
      role: findUser.role,
    };
    console.log(safeInfo);

    return Response.json(
      { success: true, message: "The operation was successful", safeInfo },
      { status: 200 },
    );
  } catch (error) {
    console.log(error);

    return Response.json(
      { success: false, message: "server error" },
      { status: 500 },
    );
  }
}
