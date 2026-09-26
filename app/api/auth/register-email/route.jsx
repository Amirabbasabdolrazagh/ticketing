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

    // User already configured email/password login
    if (user.email) {
      return Response.json(
        {
          success: false,
          message: "credentials already configured",
        },
        { status: 409 },
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

    // Validate password
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

    if (!passwordRegex.test(password)) {
      return Response.json(
        {
          success: false,
          message:
            "password must be at least 8 characters and contain uppercase, lowercase, number and symbol",
        },
        { status: 400 },
      );
    }

    // Check duplicate email
    const existingUser = await User.findOne({
      email: normalizedEmail,
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

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Save credentials
    user.email = normalizedEmail;
    user.password = hashedPassword;
    await user.save();

    return Response.json(
      {
        success: true,
        message: "email and password configured successfully",
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
