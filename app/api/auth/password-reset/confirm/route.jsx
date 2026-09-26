import bcrypt from "bcrypt";
import User from "@/models/users";
import ConnectDb from "@/utils/connectDB";
import { passwordRegex } from "@/utils/passwordReset";

export async function POST(req) {
  try {
    const { phone, code, newPassword } = await req.json();
    if (!/^09\d{9}$/.test(phone || "") || !/^\d{6}$/.test(code || "")) {
      return Response.json(
        { success: false, message: "شماره موبایل یا کد بازیابی معتبر نیست" },
        { status: 400 },
      );
    }
    if (!passwordRegex.test(newPassword || "")) {
      return Response.json(
        {
          success: false,
          message: "رمز باید حداقل ۸ کاراکتر و شامل حرف بزرگ، کوچک، عدد و نماد باشد",
        },
        { status: 400 },
      );
    }

    await ConnectDb();
    const user = await User.findOne({ phone }).select(
      "+password +passwordResetAttempts",
    );
    if (!user?.otp?.code || !user.otp.expiresAt) {
      return Response.json(
        { success: false, message: "ابتدا کد بازیابی دریافت کنید" },
        { status: 400 },
      );
    }
    if (user.otp.expiresAt.getTime() < Date.now()) {
      return Response.json(
        { success: false, message: "کد بازیابی منقضی شده است" },
        { status: 400 },
      );
    }
    if ((user.passwordResetAttempts || 0) >= 5) {
      return Response.json(
        { success: false, message: "تعداد تلاش بیش از حد مجاز است؛ کد جدید بگیرید" },
        { status: 429 },
      );
    }

    if (user.otp.code !== code) {
      await User.findByIdAndUpdate(user._id, {
        $inc: { passwordResetAttempts: 1 },
      });
      return Response.json(
        { success: false, message: "کد بازیابی اشتباه است" },
        { status: 400 },
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await User.findByIdAndUpdate(user._id, {
      $set: {
        password: hashedPassword,
        refreshToken: null,
        otp: null,
      },
      $unset: {
        passwordResetAttempts: 1,
        passwordResetLastSentAt: 1,
        passwordResetCodeHash: 1,
        passwordResetExpiresAt: 1,
      },
    });

    return Response.json({
      success: true,
      message: "رمز عبور با موفقیت تغییر کرد؛ اکنون وارد شوید",
    });
  } catch (error) {
    console.log("PASSWORD RESET CONFIRM ERROR:", error.message);
    return Response.json(
      { success: false, message: "تغییر رمز عبور انجام نشد" },
      { status: 500 },
    );
  }
}
