import User from "@/models/users";
import getCurrentUser from "@/utils/auth";
import bcrypt from "bcrypt";
export async function PATCH(req) {
  try {
    const isAuthorized = await getCurrentUser();
    if (!isAuthorized) {
      return Response.json(
        { success: false, message: "user unauthorized" },
        { status: 401 },
      );
    }
    const { currentPassword, newPassword } = await req.json();

    if (
      typeof currentPassword !== "string" ||
      typeof newPassword !== "string" ||
      !currentPassword ||
      !newPassword
    ) {
      return Response.json(
        {
          success: false,
          message: "current password and new password are required",
        },
        { status: 400 },
      );
    }
    const user = await User.findById(isAuthorized._id).select("+password");
    if (!user) {
      return Response.json(
        {
          success: false,
          message: "user not found",
        },
        { status: 404 },
      );
    }
    if (!user.password) {
      return Response.json(
        {
          success: false,
          message: "password login is not configured",
        },
        { status: 400 },
      );
    }
    const iscorrectPass = await bcrypt.compare(currentPassword, user.password);
    if (!iscorrectPass) {
      return Response.json(
        { success: false, message: "current password is Incorrect" },
        { status: 401 },
      );
    }

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

    if (!passwordRegex.test(newPassword)) {
      return Response.json(
        {
          success: false,
          message:
            "password must be at least 8 characters and contain uppercase, lowercase, number and symbol",
        },
        { status: 400 },
      );
    }

    const hashedPass = await bcrypt.hash(newPassword, 12);
    user.password = hashedPass;
    await user.save();
    return Response.json(
      { success: true, message: "password Changed successfully" },
      { status: 200 },
    );
  } catch (error) {
    return Response.json(
      { success: false, message: "server error" },
      { status: 500 },
    );
  }
}
