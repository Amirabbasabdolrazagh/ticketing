import User from "@/models/users";
import getCurrentUser from "@/utils/auth";
import ConnectDb from "@/utils/connectDB";
import bcrypt from "bcrypt";

export async function POST(req) {
  try {
    await ConnectDb();

    const { email, password } = await req.json();

    // Check authentication
    const user = await getCurrentUser();

    if (!user) {
      return Response.json(
        {
          success: false,
          message: "user unauthorized",
        },
        { status: 401 },
      );
    }

    // Basic validation
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

    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      return Response.json(
        {
          success: false,
          message: "invalid email",
        },
        { status: 400 },
      );
    }

    // Check duplicate email
    const existingUser = await User.findOne({
      email: normalizedEmail,
      _id: { $ne: user._id },
    });

    if (existingUser) {
      return Response.json(
        {
          success: false,
          message: "email already exists",
        },
        { status: 409 },
      );
    }

    const account = await User.findById(user._id).select("+password");
    if (!account) {
      return Response.json(
        { success: false, message: "کاربر پیدا نشد" },
        { status: 404 },
      );
    }

    if (account.email) {
      const passwordIsValid = account.password
        ? await bcrypt.compare(password, account.password)
        : false;
      if (!passwordIsValid) {
        return Response.json(
          { success: false, message: "رمز عبور فعلی صحیح نیست" },
          { status: 400 },
        );
      }
      account.email = normalizedEmail;
    } else {
      const passwordRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
      if (!passwordRegex.test(password)) {
        return Response.json(
          {
            success: false,
            message: "رمز باید حداقل ۸ کاراکتر و شامل حرف بزرگ، حرف کوچک، عدد و نماد باشد",
          },
          { status: 400 },
        );
      }
      account.email = normalizedEmail;
      account.password = await bcrypt.hash(password, 12);
    }
    await account.save();

    return Response.json(
      {
        success: true,
        message: user.email
          ? "ایمیل با موفقیت تغییر کرد"
          : "ایمیل و رمز عبور با موفقیت ثبت شد",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("SETUP CREDENTIALS ERROR:", error);

    return Response.json(
      {
        success: false,
        message: "server error",
      },
      { status: 500 },
    );
  }
}
