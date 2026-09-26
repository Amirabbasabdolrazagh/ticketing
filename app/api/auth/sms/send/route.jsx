import User from "@/models/users";
import ConnectDb from "@/utils/connectDB";
import axios from "axios";

export async function POST(req) {
  await ConnectDb();
  const { phone } = await req.json();
  const code = String(Math.floor(Math.random() * 900000 + 100000));
  const expiresAt = new Date().getTime() + 120000;
  const phoneREGEx = /^09\d{9}$/;
  if (!phoneREGEx.test(phone)) {
    return Response.json(
      { success: false, message: "لطفاً یک شماره موبایل معتبر وارد کنید." },
      { status: 400 },
    );
  }
  let data = {
    code: process.env.OTP_PATTERN,
    attributes: { code: code },
    recipient: phone,
    line_number: "90008361",
    number_format: "english",
  };
  let config = {
    method: "post",
    maxBodyLength: Infinity,
    url: process.env.OTP_URL,
    headers: {
      Accept: "application/json",
      "Api-Key": process.env.OTP_API_KEY,
      "Content-Type": "application/json",
    },
    data: data,
  };
  try {
    const user = await User.findOne({ phone });
    if (user?.otp?.expiresAt && user.otp.expiresAt > new Date().getTime()) {
      return Response.json(
        {
          success: false,
          message:
            "کد یکبار مصرف قبلا ارسال شده است . لطفا قبل از در خواست مجدد صبر کنید",
        },
        { status: 429 },
      );
    }
    const res = await axios.request(config);
    if (res.data.status == "success") {
      if (user) {
        user.otp = { code, expiresAt: new Date(expiresAt) };
        await user.save();
      } else {
        await User.create({
          phone,
          otp: { code, expiresAt: new Date(expiresAt) },
        });
      }
      return Response.json(
        { success: true, message: "کد تأیید با موفقیت ارسال شد." },
        { status: 200 },
      );
    } else {
      return Response.json(
        { success: false, message: "ارسال کد تأیید با خطا مواجه شد." },
        { status: 500 },
      );
    }
  } catch (error) {
    console.log("OTP ERROR:", {
      message: error.message,

      status: error.response?.status,

      data: error.response?.data,

      headers: error.response?.headers,
    });
    return Response.json(
      { success: false, message: "server error" },
      { status: 500 },
    );
  }
}
