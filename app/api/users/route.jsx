import User from "@/models/users";
import getCurrentUser from "@/utils/auth";
import authorization from "@/utils/authorization";
import ConnectDb from "@/utils/connectDB";

export async function GET(req) {
  try {
    await ConnectDb();

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
    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role");
    let AllUser;
    if (role) {
      if (role == "customer") {
        AllUser = await User.find({ role: "customer" });
      } else if (role == "agent") {
        AllUser = await User.find({ role: "agent" });
      } else {
        AllUser = await User.find();
      }
    }
    if (!role) {
      AllUser = await User.find();
    }
    const safeInfo = AllUser.map((user) => ({
      userId: user._id.toString(),
      name: user.name,
      phone: user.phone,
      role: user.role,
    }));
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

export async function POST(req) {
  try {
    const { name, phone, role } = await req.json();
    await ConnectDb();
    const isValidUser = await getCurrentUser();
    if (!isValidUser) {
      return Response.json(
        { success: false, message: "user unauthorized" },
        { status: 401 },
      );
    }

    const validRole = authorization(isValidUser, ["admin"]);

    if (!validRole) {
      return Response.json(
        { success: false, message: "Forbidden" },
        { status: 403 },
      );
    }

    if (!name || !phone || !role) {
      return Response.json(
        {
          success: false,
          message: "all fields are required",
        },
        { status: 400 },
      );
    }
    const alloewRoles = ["admin", "agent", "customer"];
    if (!alloewRoles.includes(role)) {
      return Response.json(
        { success: false, message: "invalid role" },
        { status: 400 },
      );
    }
    const phoneREGEx = /^09\d{9}$/;
    if (!phoneREGEx.test(phone)) {
      return Response.json(
        { success: false, message: "لطفاً یک شماره موبایل معتبر وارد کنید." },
        { status: 400 },
      );
    }
    const existsUser = await User.findOne({ phone });
    if (existsUser) {
      return Response.json(
        {
          success: false,
          message: "phone already exists",
        },

        { status: 409 },
      );
    }

    const user = await User.create({ name, phone, role, isVerify: true });
    return Response.json(
      {
        success: true,
        message: "user created successfully",
        user
      },
      { status: 201 },
    );
  } catch (error) {
    return Response.json(
      { success: false, message: "server error" },
      { status: 500 },
    );
  }
}
