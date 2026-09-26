import { randomInt } from "crypto";
import User from "@/models/users";
import ConnectDb from "@/utils/connectDB";
import sendSmsCode from "@/utils/sendSmsCode";

export async function POST(req) {
  try {
    const { phone } = await req.json();
    if (typeof phone !== "string" || !/^09\d{9}$/.test(phone)) {
      return Response.json(
        { success: false, message: "شماره موبایل معتبر وارد کنید" },
        { status: 400 },
      );
    }

    await ConnectDb();
    const user = await User.findOne({ phone }).select(
      "+password +passwordResetLastSentAt",
    );
    if (!user || !user.password) {
      return Response.json(
        { success: false, message: "حسابی با امکان ورود رمز برای این شماره پیدا نشد" },
        { status: 404 },
      );
    }

    if (
      user.passwordResetLastSentAt &&
      Date.now() - user.passwordResetLastSentAt.getTime() < 60_000
    ) {
      return Response.json(
        { success: false, message: "برای ارسال مجدد کد یک دقیقه صبر کنید" },
        { status: 429 },
      );
    }

    const code = String(randomInt(100000, 1000000));
    await sendSmsCode(phone, code);
    await User.findByIdAndUpdate(user._id, {
      $set: {
        otp: {
          code,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
        passwordResetAttempts: 0,
        passwordResetLastSentAt: new Date(),
      },
      $unset: {
        passwordResetCodeHash: 1,
        passwordResetExpiresAt: 1,
      },
    });

    return Response.json({
      success: true,
      message: "کد بازیابی رمز برای شما پیامک شد",
    });
  } catch (error) {
    console.log("PASSWORD RESET REQUEST ERROR:", error.message);
    return Response.json(
      { success: false, message: "ارسال کد بازیابی انجام نشد" },
      { status: 500 },
    );
  }
}
